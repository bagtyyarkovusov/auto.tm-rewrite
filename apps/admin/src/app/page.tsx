import { Button } from "@auto-tm/ui/components";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-neutral-900">Admin Login</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Phone OTP + TOTP 2FA required
        </p>
        <div className="mt-8">
          <Button variant="primary" size="lg" className="w-full">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
