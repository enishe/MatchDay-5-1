import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Trophy, User, Mail, Phone, CreditCard, Lock } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-accent/10 rounded-full">
              <Trophy className="h-12 w-12 text-accent" />
            </div>
          </div>
          <h2 className="text-4xl font-heading font-bold gradient-text mb-2">
            MATCHDAY
          </h2>
          <p className="text-text/70">
            Regjistrohuni për të filluar të luani
          </p>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('name')}
                type="text"
                id="name"
                label="Emri i plotë"
                placeholder="Emri dhe Mbiemri"
                className="pl-10"
                error={errors.name?.message}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('email')}
                type="email"
                id="email"
                label="Email"
                placeholder="email@shembull.com"
                className="pl-10"
                error={errors.email?.message}
              />
            </div>

            {/* Username */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('username')}
                type="text"
                id="username"
                label="Username Matchday"
                placeholder="username_matchday"
                className="pl-10"
                error={errors.username?.message}
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('phone_number')}
                type="tel"
                id="phone_number"
                label="Numri i telefonit"
                placeholder="+383 4x xxx xxx"
                className="pl-10"
                error={errors.phone_number?.message}
              />
            </div>

            {/* Bank Account */}
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('bank_account')}
                type="text"
                id="bank_account"
                label="Numri i llogarisë bankare"
                placeholder="IBAN ose numër llogarie"
                className="pl-10"
                error={errors.bank_account?.message}
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Roli</label>
              <div className="space-y-2">
                <label className="flex items-center p-3 bg-bg/50 border border-border rounded-lg hover:border-accent/50 cursor-pointer transition-colors">
                  <input {...register('role')} type="radio" value="participant" className="h-4 w-4 text-accent" />
                  <span className="ml-2 text-sm text-text">Lojtar (Pjesëmarrës)</span>
                </label>
                <label className="flex items-center p-3 bg-bg/50 border border-border rounded-lg hover:border-accent/50 cursor-pointer transition-colors">
                  <input {...register('role')} type="radio" value="organizer" className="h-4 w-4 text-accent" />
                  <span className="ml-2 text-sm text-text">Organizator (Krijues ndeshjesh)</span>
                </label>
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                label="Fjalëkalimi"
                placeholder="••••••••"
                className="pl-10 pr-12"
                error={errors.password?.message}
              />
              <button 
                type="button" 
                className="absolute right-3 top-[38px] text-text/50 hover:text-text transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text/50 z-10" />
              <Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                label="Konfirmo fjalëkalimin"
                placeholder="••••••••"
                className="pl-10 pr-12"
                error={errors.confirmPassword?.message}
              />
              <button 
                type="button" 
                className="absolute right-3 top-[38px] text-text/50 hover:text-text transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Duke regjistruar...' : 'Regjistrohuni'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-text/70">
            Keni tashmë llogari? <Link to="/login" className="text-accent hover:text-accent/80 font-medium transition-colors">Kyçuni këtu</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;