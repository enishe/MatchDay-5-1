import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Trophy, User, Mail, Phone, CreditCard, Lock } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// KORRIGJIMI: Heqja e .required() dhe perdorimi i .min(1, ...) per fushat e detyrueshme
const registerSchema = z.object({
  name: z.string()
    .min(1, 'Emri është i detyrueshëm')
    .min(2, 'Emri duhet të ketë të paktën 2 karaktere'),
  email: z.string()
    .min(1, 'Email është i detyrueshëm')
    .email('Email i pavlefshëm'),
  username: z.string()
    .min(1, 'Username është i detyrueshëm')
    .min(3, 'Username duhet të ketë të paktën 3 karaktere'),
  phone_number: z.string()
    .min(1, 'Numri i telefonit është i detyrueshëm')
    .min(9, 'Numri i telefonit nuk është i vlefshëm'),
  bank_account: z.string()
    .min(1, 'Llogaria bankare është e detyrueshme')
    .min(10, 'Numri i llogarisë bankare nuk është i vlefshëm'),
  password: z.string()
    .min(1, 'Fjalëkalimi është i detyrueshëm')
    .min(6, 'Fjalëkalimi duhet të ketë të paktën 6 karaktere'),
  confirmPassword: z.string()
    .min(1, 'Konfirmimi i fjalëkalimit është i detyrueshëm'),
  role: z.enum(['participant', 'organizer'], {
    errorMap: () => ({ message: 'Zgjidhni një rol' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Fjalëkalimet nuk përputhen',
  path: ['confirmPassword'],
});

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      clearError();
      const { confirmPassword, ...userData } = data;
      await registerUser(userData);
      
      // Kontrolli i rolit pas regjistrimit te suksesshem
      const storedUser = localStorage.getItem('matchday_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/player/fields');
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Trophy className="h-12 w-12 text-accent" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-text">
            Krijo llogari MATCHDAY
          </h2>
          <p className="mt-2 text-sm text-text/70">
            Regjistrohuni për të filluar të luani
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-panel p-6 rounded-lg border border-border space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
                Emri i plotë
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Emri dhe Mbiemri"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="email@shembull.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text mb-1">
                Username Matchday
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('username')}
                  type="text"
                  id="username"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="username_matchday"
                />
              </div>
              {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-text mb-1">
                Numri i telefonit
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('phone_number')}
                  type="tel"
                  id="phone_number"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="+383 4x xxx xxx"
                />
              </div>
              {errors.phone_number && <p className="mt-1 text-sm text-red-400">{errors.phone_number.message}</p>}
            </div>

            {/* Bank Account */}
            <div>
              <label htmlFor="bank_account" className="block text-sm font-medium text-text mb-1">
                Numri i llogarisë bankare
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('bank_account')}
                  type="text"
                  id="bank_account"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="IBAN ose numër llogarie"
                />
              </div>
              {errors.bank_account && <p className="mt-1 text-sm text-red-400">{errors.bank_account.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">Roli</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input {...register('role')} type="radio" value="participant" className="h-4 w-4 text-accent" />
                  <span className="ml-2 text-sm text-text">Lojtar (Pjesëmarrës)</span>
                </label>
                <label className="flex items-center">
                  <input {...register('role')} type="radio" value="organizer" className="h-4 w-4 text-accent" />
                  <span className="ml-2 text-sm text-text">Organizator (Krijues ndeshjesh)</span>
                </label>
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1">Fjalëkalimi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">Konfirmo fjalëkalimin</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="••••••••"
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-bg bg-accent hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Duke regjistruar...' : 'Regjistrohuni'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-text/70">
            Keni tashmë llogari? <Link to="/login" className="text-accent hover:text-accent/80 font-medium">Kyçuni këtu</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;