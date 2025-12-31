interface ForgotPasswordEmailProps {
  resetLink: string;
  userName?: string;
}

export function ForgotPasswordEmail({
  resetLink,
  userName,
}: ForgotPasswordEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        backgroundColor: "#fafafa",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          padding: "40px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1a1a1a",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Reset your password
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to reset
          your password. Click the button below to choose a new password.
        </p>
        <a
          href={resetLink}
          style={{
            display: "inline-block",
            backgroundColor: "#0d9488",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Reset Password
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request a password reset, you can safely ignore
          this email. Your password will remain unchanged.
        </p>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e5e5",
            margin: "32px 0",
          }}
        />
        <p
          style={{
            fontSize: "12px",
            color: "#9a9a9a",
            margin: "0",
          }}
        >
          This link will expire in 1 hour. If the button above doesn&apos;t
          work, copy and paste this URL into your browser:
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#0d9488",
            wordBreak: "break-all",
            marginTop: "8px",
          }}
        >
          {resetLink}
        </p>
      </div>
    </div>
  );
}
