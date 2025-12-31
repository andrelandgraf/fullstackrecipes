interface ChangeEmailProps {
  confirmationLink: string;
  newEmail: string;
  userName?: string;
}

export function ChangeEmail({
  confirmationLink,
  newEmail,
  userName,
}: ChangeEmailProps) {
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
          Approve email change
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to change
          your email address.
        </p>
        <div
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#6b6b6b",
              margin: "0 0 4px 0",
            }}
          >
            New email address:
          </p>
          <p
            style={{
              fontSize: "16px",
              color: "#1a1a1a",
              fontWeight: "500",
              margin: "0",
            }}
          >
            {newEmail}
          </p>
        </div>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Click the button below to approve this change. A verification email
          will then be sent to your new email address.
        </p>
        <a
          href={confirmationLink}
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
          Approve Email Change
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request this change, please ignore this email or
          contact support if you&apos;re concerned about your account security.
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
          {confirmationLink}
        </p>
      </div>
    </div>
  );
}
