interface TicketInfoProps {
  subject: string;
  fromName: string;
  fromEmail: string;
  createdAt: string;
  body: string;
}

export default function TicketInfo({ subject, fromName, fromEmail, createdAt, body }: TicketInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{subject}</h1>
        <p className="text-sm text-muted-foreground">
          From <span className="text-foreground font-medium">{fromName}</span>{" "}
          &lt;{fromEmail}&gt; · {new Date(createdAt).toLocaleString()}
        </p>
      </div>

      <div className="rounded-md border p-4 bg-muted/40 whitespace-pre-wrap text-sm leading-relaxed">
        {body}
      </div>
    </div>
  );
}
