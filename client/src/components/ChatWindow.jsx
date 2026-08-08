import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages }) {
  return (
    <div className="space-y-4 mb-6 h-[500px] overflow-y-auto">

      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          sender={message.sender}
          text={message.text}
        />
      ))}

    </div>
  );
}