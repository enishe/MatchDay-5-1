import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Trophy, User, Mail, Phone, CreditCard, Lock } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Emri duhet të ketë të paktën 2 karaktere').required('Emri është i detyrueshëm'),
  email: z.string().email('Email i pavlefshëm').required('Email është i detyrueshëm'),
  username: z.string().min(3, 'Username duhet të ketë të paktën 3 karaktere').required('Username është i detyrueshëm'),
  phone_number: z.string().min(9, 'Numri i telefonit nuk është i vlefshëm').required('Numri i telefonit është i detyrueshëm'),
  bank_account: z.string().min(10, 'Numri i llogarisë bankare nuk është i vlefshëm').required('Llogaria bankare është e detyrueshme'),
  password: z.string().min(6, 'Fjalëkalimi duhet të ketë të paktën 6 karaktere').required('Fjalëkalimi është i detyrueshëm'),
  confirmPassword: z.string().required('Konfirmimi i fjalëkalimit është i detyrueshëm'),
  role: z.enum(['participant', 'organizer'], {
    required_error: 'Zgjidhni një rol',
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
      
      // Redirect based on user role
      const user = JSON.parse(localStorage.getItem('matchday_user'));
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/player/fields');
      }
    } catch (error) {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
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

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-panel p-6 rounded-lg border border-border space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Name field */}
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
                  autoComplete="name"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Emri dhe Mbiemri"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Email field */}
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
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="email@shembull.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Username field */}
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
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="username_matchday"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Phone number field */}
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
                  autoComplete="tel"
                  className="w-full pl-10 pr-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="+383 4x xxx xxx"
                />
              </div>
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-400">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Bank account field */}
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
              {errors.bank_account && (
                <p className="mt-1 text-sm text-red-400">{errors.bank_account.message}</p>
              )}
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Roli
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    {...register('role')}
                    type="radio"
                    value="participant"
                    className="h-4 w-4 bg-bg border-border rounded text-accent focus:ring-accent"
                  />
                  <span className="ml-2 text-sm text-text">Lojtar (Pjesëmarrës)</span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('role')}
                    type="radio"
                    value="organizer"
                    className="h-4 w-4 bg-bg border-border rounded text-accent focus:ring-accent"
                  />
                  <span className="ml-2 text-sm text-text">Organizator (Krijues ndeshjesh)</span>
                </label>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                Fjalëkalimi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text/50 hover:text-text"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">
                Konfirmo fjalëkalimin
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text/50" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text/50 hover:text-text"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-bg bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin"></div>
                  <span>Duke regjistruar...</span>
                </div>
              ) : (
                'Regjistrohuni'
              )}
            </button>
          </div>
        </form>

        {/* Login link */}
        <div className="text-center">
          <p className="text-sm text-text/70">
            Keni tashmë llogari?{' '}
            <Link to="/login" className="text-accent hover:text-accent/80 font-medium">
              Kyçuni këtu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
