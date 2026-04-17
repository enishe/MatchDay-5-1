import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Trophy } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// KORRIGJIMI: Zod nuk ka metode .required(). 
// Per fushat e detyrueshme perdoret .min(1, 'mesazhi')
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email është i detyrueshëm')
    .email('Email i pavlefshëm'),
  password: z.string()
    .min(1, 'Fjalëkalimi është i detyrueshëm')
    .min(6, 'Fjalëkalimi duhet të ketë të paktën 6 karaktere'),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      clearError();
      await login(data.email, data.password);
      
      // Kontrolli i rolit pas login-it te suksesshem
      const userData = localStorage.getItem('matchday_user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/player/fields');
        }
      }
    } catch (err) {
      // Gabimi menaxhohet automatikisht nga store (authStore)
      console.error("Login error:", err);
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
            Mirëse vini në MATCHDAY
          </h2>
          <p className="mt-2 text-sm text-text/70">
            Kyçuni për të menaxhuar ndeshjet tuaja
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

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="email@shembull.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                Fjalëkalimi
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-md text-text placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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

            {/* Remember me and forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 bg-bg border-border rounded text-accent focus:ring-accent"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-text/70">
                  Më kujto
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="text-accent hover:text-accent/80">
                  Harruat fjalëkalimin?
                </a>
              </div>
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
                  <span>Duke kyçur...</span>
                </div>
              ) : (
                'Kyçuni'
              )}
            </button>
          </div>
        </form>

        {/* Register link */}
        <div className="text-center">
          <p className="text-sm text-text/70">
            Nuk keni llogari?{' '}
            <Link to="/register" className="text-accent hover:text-accent/80 font-medium">
              Regjistrohuni këtu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;