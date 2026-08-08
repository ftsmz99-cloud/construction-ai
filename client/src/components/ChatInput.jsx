export default function ChatInput({
  value,
  onChange,
  onSend
}) {
  return (
    <div className="flex gap-3">

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSend();
          }
        }}
        placeholder="Type a customer message..."
        className="flex-1 border rounded-xl px-4 py-3"
      />

      <button
        onClick={onSend}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl"
      >
        Send
      </button>

    </div>
  );
}