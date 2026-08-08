import ReactMarkdown from "react-markdown";

export default function MessageBubble({ sender, text }) {

  const isAI = sender === "ai";

  return (
    <div
      className={
        isAI
          ? "flex justify-start"
          : "flex justify-end"
      }
    >
      <div
        className={
          isAI
            ? "bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl rounded-bl-md max-w-lg shadow-sm leading-relaxed"
            : "bg-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-lg shadow-sm leading-relaxed"
        }
      >

        <div className="text-xs font-semibold mb-2 opacity-60">
          {isAI ? "AI Receptionist" : "Customer"}
        </div>


        <ReactMarkdown>
          {text}
        </ReactMarkdown>


      </div>
    </div>
  );
}