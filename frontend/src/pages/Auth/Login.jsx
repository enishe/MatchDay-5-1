import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Trophy, Mail, Lock } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Card from '../../components/UI/Card';

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
      
      // Kontrolli i rolit pas login te suksesshem
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
      console.error("Login error:", err);
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
            Hyni për të vazhduar të luani
          </p>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Duke hyrë...' : 'Kyçuni'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-text/70">
            Nuk keni llogari? <Link to="/register" className="text-accent hover:text-accent/80 font-medium transition-colors">Regjistrohuni këtu</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
