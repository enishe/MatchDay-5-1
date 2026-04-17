const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const pool = require('../config/db');



const JWT_SECRET = process.env.JWT_SECRET || 'matchday-secret-key';



class AuthService {

    // Register new user

    async register(userData) {

        const { name, email, password, username, phone_number, bank_account, role = 'participant' } = userData;

        

        // Validate required fields

        if (!name || !email || !password || !username || !phone_number || !bank_account) {

            throw new Error('All fields are required');

        }



        // Check if user already exists

        const existingUser = await pool.query(

            'SELECT id FROM Users WHERE email = $1',

            [email]

        );

        

        if (existingUser.rows.length > 0) {

            throw new Error('User with this email already exists');

        }



        // Check if username already exists

        const existingUsername = await pool.query(

            'SELECT id FROM UserProfiles WHERE username = $1',

            [username]

        );

        

        if (existingUsername.rows.length > 0) {

            throw new Error('Username already taken');

        }



        // Hash password

        const saltRounds = 12;

        const hashedPassword = await bcrypt.hash(password, saltRounds);



        const client = await pool.connect();

        

        try {

            await client.query('BEGIN');

            

            // Insert user

            const userResult = await client.query(

                `INSERT INTO Users (name, email, password, role) 

                 VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,

                [name, email, hashedPassword, role]

            );

            

            const user = userResult.rows[0];

            

            // Insert user profile

            await client.query(

                `INSERT INTO UserProfiles (user_id, username, phone_number, bank_account) 

                 VALUES ($1, $2, $3, $4)`,

                [user.id, username, phone_number, bank_account]

            );

            

            // Insert notification preferences

            await client.query(

                `INSERT INTO NotificationPreferences (user_id) 

                 VALUES ($1)`,

                [user.id]

            );

            

            await client.query('COMMIT');

            

            // Generate JWT token

            const token = this.generateToken(user);

            

            return {

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email,

                    role: user.role,

                    username: username,

                    phone_number: phone_number

                },

                token

            };

            

        } catch (error) {

            await client.query('ROLLBACK');

            throw error;

        } finally {

            client.release();

        }

    }



    // Login user

    async login(email, password) {

        if (!email || !password) {

            throw new Error('Email and password are required');

        }



        // Get user with profile

        const result = await pool.query(

            `SELECT u.id, u.name, u.email, u.password, u.role, u.created_at,

                    up.username, up.phone_number, up.bank_account

             FROM Users u

             LEFT JOIN UserProfiles up ON u.id = up.user_id

             WHERE u.email = $1`,

            [email]

        );



        if (result.rows.length === 0) {

            throw new Error('Invalid credentials');

        }



        const user = result.rows[0];

        

        // Check password

        const isPasswordValid = await bcrypt.compare(password, user.password);

        

        if (!isPasswordValid) {

            throw new Error('Invalid credentials');

        }



        // Generate JWT token

        const token = this.generateToken(user);

        

        return {

            user: {

                id: user.id,

                name: user.name,

                email: user.email,

                role: user.role,

                username: user.username,

                phone_number: user.phone_number

            },

            token

        };

    }



    // Generate JWT token

    generateToken(user) {

        return jwt.sign(

            { 

                id: user.id, 

                email: user.email, 

                role: user.role 

            },

            JWT_SECRET,

            { expiresIn: '7d' }

        );

    }



    // Verify JWT token

    verifyToken(token) {

        try {

            return jwt.verify(token, JWT_SECRET);

        } catch (error) {

            throw new Error('Invalid token');

        }

    }



    // Get user by ID

    async getUserById(userId) {

        const result = await pool.query(

            `SELECT u.id, u.name, u.email, u.role, u.created_at,

                    up.username, up.phone_number, up.bank_account, up.avatar_url,

                    up.preferred_position, up.skill_level

             FROM Users u

             LEFT JOIN UserProfiles up ON u.id = up.user_id

             WHERE u.id = $1`,

            [userId]

        );



        if (result.rows.length === 0) {

            throw new Error('User not found');

        }



        const user = result.rows[0];

        return {

            id: user.id,

            name: user.name,

            email: user.email,

            role: user.role,

            username: user.username,

            phone_number: user.phone_number,

            bank_account: user.bank_account,

            avatar_url: user.avatar_url,

            preferred_position: user.preferred_position,

            skill_level: user.skill_level

        };

    }



    // Update user profile

    async updateProfile(userId, profileData) {

        const { name, username, phone_number, bank_account, avatar_url, preferred_position, skill_level } = profileData;

        

        const client = await pool.connect();

        

        try {

            await client.query('BEGIN');

            

            // Update users table

            if (name) {

                await client.query(

                    'UPDATE Users SET name = $1 WHERE id = $2',

                    [name, userId]

                );

            }

            

            // Update user profile

            const updateFields = [];

            const updateValues = [];

            let paramIndex = 1;

            

            if (username) {

                updateFields.push(`username = $${paramIndex++}`);

                updateValues.push(username);

            }

            if (phone_number) {

                updateFields.push(`phone_number = $${paramIndex++}`);

                updateValues.push(phone_number);

            }

            if (bank_account) {

                updateFields.push(`bank_account = $${paramIndex++}`);

                updateValues.push(bank_account);

            }

            if (avatar_url) {

                updateFields.push(`avatar_url = $${paramIndex++}`);

                updateValues.push(avatar_url);

            }

            if (preferred_position) {

                updateFields.push(`preferred_position = $${paramIndex++}`);

                updateValues.push(preferred_position);

            }

            if (skill_level) {

                updateFields.push(`skill_level = $${paramIndex++}`);

                updateValues.push(skill_level);

            }

            

            if (updateFields.length > 0) {

                updateValues.push(userId);

                await client.query(

                    `UPDATE UserProfiles SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,

                    updateValues

                );

            }

            

            await client.query('COMMIT');

            

            return await this.getUserById(userId);

            

        } catch (error) {

            await client.query('ROLLBACK');

            throw error;

        } finally {

            client.release();

        }

    }



    // Search users by username (for invitations)

    async searchUsersByUsername(query, currentUserId) {

        if (!query || query.length < 2) {

            return [];

        }



        const result = await pool.query(

            `SELECT u.id, u.name, up.username, up.skill_level, up.preferred_position

             FROM Users u

             JOIN UserProfiles up ON u.id = up.user_id

             WHERE up.username ILIKE $1 

               AND u.id != $2

               AND u.role IN ('participant', 'organizer')

               AND up.is_active = true

             ORDER BY up.username

             LIMIT 10`,

            [`%${query}%`, currentUserId]

        );



        return result.rows;

    }

}



module.exports = AuthService;

