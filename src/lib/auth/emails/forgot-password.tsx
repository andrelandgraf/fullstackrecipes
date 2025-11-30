interface ForgotPasswordEmailProps {
  resetLink: string;
}

export function ForgotPasswordEmail({ resetLink }: ForgotPasswordEmailProps) {
  return (
    <div>
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href={resetLink}>Reset Password</a>
      <p>If you did not request a password reset, please ignore this email.</p>
    </div>
  );
}
