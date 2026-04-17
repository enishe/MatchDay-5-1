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
      const { confirmPassword, ...rest } = data;
      const result = await registerUser(rest);
      if (result?.user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/player/fields', { replace: true });
      }
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-10 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full animate-pulse-slow">
              <Trophy className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold gradient-text mb-2">
            MATCHDAY
          </h2>
          <p className="text-text-muted text-sm sm:text-base">
            Regjistrohuni si organizator për të menaxhuar ndeshjet
          </p>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-text-muted z-10 sm:top-10" />
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

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-text-muted z-10 sm:top-10" />
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

            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-text-muted z-10 sm:top-10" />
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

            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-text-muted z-10 sm:top-10" />
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

            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-3 top-[38px] h-5 w-5 text-text-muted z-10 sm:top-10" />
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

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[38px] z-[1] h-5 w-5 text-text-muted sm:top-10" />
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                label="Fjalëkalimi"
                placeholder="••••••••"
                className="pl-10"
                error={errors.password?.message}
                endAdornment={
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-text-muted hover:text-primary"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Fsheh fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[38px] z-[1] h-5 w-5 text-text-muted sm:top-10" />
              <Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                label="Konfirmo fjalëkalimin"
                placeholder="••••••••"
                className="pl-10"
                error={errors.confirmPassword?.message}
                endAdornment={
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-text-muted hover:text-primary"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Fsheh fjalëkalimin' : 'Shfaq fjalëkalimin'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />
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
          <p className="text-text-muted text-sm sm:text-base">
            Keni tashmë llogari?{' '}
            <Link to="/login" className="text-primary hover:text-primary-light font-medium transition-colors">
              Kyçuni këtu
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
