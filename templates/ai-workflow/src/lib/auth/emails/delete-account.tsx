interface DeleteAccountEmailProps {
  confirmationLink: string;
  userName?: string;
}

export function DeleteAccountEmail({
  confirmationLink,
  userName,
}: DeleteAccountEmailProps) {
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
            color: "#dc2626",
            marginTop: "0",
            marginBottom: "16px",
          }}
        >
          Confirm Account Deletion
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#4a4a4a",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          {userName ? `Hi ${userName},` : "Hi,"} we received a request to
          permanently delete your account.
        </p>
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#dc2626",
              fontWeight: "500",
              margin: "0 0 8px 0",
            }}
          >
            Warning: This action is irreversible
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#7f1d1d",
              margin: "0",
            }}
          >
            Clicking the button below will permanently delete your account and
            all associated data. This cannot be undone.
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
          If you&apos;re sure you want to proceed, click the button below:
        </p>
        <a
          href={confirmationLink}
          style={{
            display: "inline-block",
            backgroundColor: "#dc2626",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "16px",
          }}
        >
          Delete My Account
        </a>
        <p
          style={{
            fontSize: "14px",
            color: "#6b6b6b",
            marginTop: "32px",
            lineHeight: "1.5",
          }}
        >
          If you didn&apos;t request this deletion, please ignore this email or
          contact support immediately. Your account will remain safe.
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
            color: "#dc2626",
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
