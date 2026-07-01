import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, AlertTriangle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      // Validar email antes de criar conta
      let validationResult;
      try {
        const validationResponse = await base44.functions.invoke("validateRegistrationEmail", { email });
        validationResult = validationResponse?.data ?? validationResponse;
      } catch (valErr) {
        setError("Não foi possível validar o email. Tente novamente.");
        return;
      }

      if (!validationResult?.success) {
        setError(validationResult?.error || "Não foi possível validar o email. Tente novamente.");
        return;
      }

      const status = validationResult.status;

      if (status === "ALREADY_REGISTERED") {
        setError("Este email já possui cadastro. Faça login ou recupere sua senha.");
        return;
      }
      if (status === "INACTIVE_OR_BLOCKED") {
        setError("Este email está vinculado a um cadastro inativo. Entre em contato com o suporte.");
        return;
      }
      if (status === "EMPLOYEE_EXISTS_NO_USER") {
        setError("Existe um vínculo pendente para este email. Solicite um novo convite ao administrador.");
        return;
      }
      if (status === "INVITED" && validationResult.redirect_url) {
        window.location.href = validationResult.redirect_url;
        return;
      }
      if (status === "INVITED") {
        setError("Este email possui um convite pendente. Verifique sua caixa de entrada.");
        return;
      }

      // status === "AVAILABLE" — seguir cadastro normal
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }

      // 1. Prioridade: token salvo na sessão (clique direto no link de convite antes do cadastro)
      const pendingToken = sessionStorage.getItem("invite_token_pending");
      if (pendingToken) {
        sessionStorage.removeItem("invite_token_pending");
        window.location.href = `/PrimeiroAcesso?token=${pendingToken}`;
        return;
      }

      // 2. Checar estado de onboarding server-side
      let onboardingResult;
      try {
        const onboardingResponse = await base44.functions.invoke("resolveOnboardingState", {});
        onboardingResult = onboardingResponse?.data ?? onboardingResponse;
      } catch (onboardingErr) {
        setError(
          "Não foi possível verificar seu perfil de acesso. " +
          "Tente novamente ou entre em contato com o administrador."
        );
        return;
      }

      if (!onboardingResult?.success || !onboardingResult?.state) {
        setError(
          onboardingResult?.error ||
          "Não foi possível verificar seu perfil de acesso."
        );
        return;
      }

      // 3. Rotear conforme estado retornado
      const { state, redirect_url } = onboardingResult;

      if ((state === 'INVITED' || state === 'INVITE_EXPIRED') && redirect_url) {
        window.location.href = redirect_url;
        return;
      }
      if (state === 'COMPLETE_PROFILE') {
        window.location.href = '/CompletarPerfil';
        return;
      }
      if (state === 'NEW_OWNER') {
        window.location.href = '/Cadastro';
        return;
      }
      if (state === 'PENDING_LINK') {
        setError("Seu vínculo está em processamento. Tente novamente em alguns instantes ou fale com o administrador.");
        return;
      }
      if (state === 'BLOCKED') {
        setError("Acesso bloqueado. Entre em contato com o administrador.");
        return;
      }
      if (state === 'ERROR') {
        setError("Erro ao verificar acesso. Tente novamente.");
        return;
      }

      // READY — ir para home
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    const pendingToken = sessionStorage.getItem("invite_token_pending");
    const redirectAfter = pendingToken ? `/PrimeiroAcesso?token=${pendingToken}` : "/";
    base44.auth.loginWithProvider("google", redirectAfter);
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <button onClick={() => base44.auth.redirectToLogin()} className="text-primary font-medium hover:underline">
            Log in
          </button>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}