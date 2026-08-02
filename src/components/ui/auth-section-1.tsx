"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

interface AuthSectionProps {
  isLogin: boolean;
  setIsLogin: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn: () => void;
  loading: boolean;
  error?: string;
  isPasswordValid?: boolean;
  PasswordValidation?: React.FC;
  termsText?: ReactNode;
}

export default function AuthSectionOne({
  isLogin,
  setIsLogin,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onGoogleSignIn,
  loading,
  error,
  isPasswordValid,
  PasswordValidation,
  termsText,
}: AuthSectionProps) {
  return (
    <section className="min-h-screen relative flex items-center justify-center p-4 text-foreground antialiased [font-synthesis:none]">
      {/* Full-screen animated backdrop */}
      <div className="fixed inset-0 z-0">
        <GrainGradient
          speed={0.5}
          scale={1.5}
          rotation={0}
          offsetX={0}
          offsetY={0}
          softness={0.8}
          intensity={0.3}
          noise={0.3}
          shape="corners"
          frame={2854.5}
          colors={["#1c0c14", "#5d2a42", "#1c0c14", "#5d2a42"]}
          colorBack="#000000"
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      </div>

      {/* Centered Widget Card */}
      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-[1fr_1fr] rounded-[2.5rem] overflow-hidden shadow-card border border-border bg-card/50 backdrop-blur-2xl">

        {/* Left Panel: Form */}
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 relative">
          {/* Subtle ambient glow behind form */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none" />

          <div className="w-full max-w-[420px] relative z-10">
            <div>
              <h1 className="whitespace-nowrap text-3xl font-bold tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05] xl:text-[50px]">
                {isLogin ? "Welcome back" : "Create an account"}
              </h1>
              <p className="mt-3 whitespace-nowrap text-lg leading-snug text-muted-foreground sm:text-xl lg:text-2xl xl:text-3xl">
                Brainstorm in chat, build in Fora
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-1">
              <SocialButton
                icon={<GoogleIcon />}
                label={isLogin ? "Sign in with Google" : "Sign up with Google"}
                onClick={onGoogleSignIn}
                disabled={loading}
              />
            </div>

            <div className="my-10 text-center text-xl font-medium text-muted-foreground">
              or
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              {error && (
                <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                  {error}
                </div>
              )}

              <FieldBox
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <FieldBox
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />

              {!isLogin && PasswordValidation && (
                <div className="pt-2 text-sm">
                  <PasswordValidation />
                </div>
              )}

              <div className="space-y-4 pt-2 text-sm leading-5 text-muted-foreground sm:text-[15px]">
                {!isLogin && (
                  <>
                    <CheckboxLine>
                      I want to receive emails about Fora feature updates
                    </CheckboxLine>
                    <CheckboxLine>{termsText}</CheckboxLine>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || (!isLogin && isPasswordValid === false)}
                className="mt-9 flex h-14 w-full items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground transition-bounce hover:scale-[1.02] shadow-glow disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-primary hover:underline transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Hero */}
        <div className="relative flex min-h-[600px] overflow-hidden bg-black p-8 text-white sm:p-12 lg:min-h-0" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            alt="Background"
            className="absolute inset-0 object-cover w-full h-full opacity-40 mix-blend-overlay z-0"
          />
          <GrainGradient
            speed={0.6}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.5}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            colors={["#FA3854", "#BD284E", "#FA3854", "#BD284E"]}
            colorBack="rgba(0,0,0,0)"
            className="absolute inset-0 bg-background/50 z-0"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <h2 className="max-w-[620px] pt-0 text-5xl font-bold tracking-[-0.05em] text-white sm:text-5xl lg:pt-8 lg:text-[54px] lg:leading-[0.98] xl:text-[60px]">
              Think fast,
              <br />
              Build faster
            </h2>

          </div>
        </div>
      </div>
    </section>
  );
}

function SocialButton({
  icon,
  label,
  onClick,
  disabled
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 items-center justify-center gap-3 rounded-xl border border-border bg-input px-3 text-base font-medium leading-none text-foreground transition-smooth hover:bg-elevated hover:shadow-soft disabled:opacity-50 xl:text-[19px]"
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function FieldBox({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = value !== "";

  return (
    <label className="flex h-14 items-center justify-between gap-4 rounded-xl border border-border bg-input px-5 text-lg leading-none focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-smooth xl:text-xl">
      {!isFocused && !isFilled && (
        <span className="absolute text-muted-foreground pointer-events-none transition-smooth">
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        aria-label={label}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={onChange}
        className="min-w-0 flex-1 truncate bg-transparent text-foreground outline-none relative z-10"
      />
    </label>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span className="relative mt-1 size-4 shrink-0">
        <input
          type="checkbox"
          className="peer size-full appearance-none rounded-[4px] border border-border bg-input checked:border-primary checked:bg-primary transition-smooth group-hover:border-primary/50"
        />
        <Check
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 hidden size-full p-[1px] text-primary-foreground peer-checked:block"
          aria-hidden="true"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 4.7 10.7 3.6v7.7H3V4.7Zm8.8-1.25L21 2.1v9.2h-9.2V3.45ZM3 12.7h7.7v7.7L3 19.3v-6.6Zm8.8 0H21v9.2l-9.2-1.3v-7.9Z" />
    </svg>
  );
}
