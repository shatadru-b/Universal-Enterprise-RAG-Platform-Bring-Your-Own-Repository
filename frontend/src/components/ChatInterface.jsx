import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { cn } from "../lib/utils";
import axios from "axios";
import ReactMarkdown from "react-markdown";

export const ChatInterface = () => {
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm your AI assistant. Upload your documents and ask me anything about them. I'll help you explore insights and find information across all your uploaded files.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Focus input after sending
        setTimeout(() => inputRef.current?.focus(), 100);

        try {
            const response = await axios.post("/api/ask", {
                question: userMessage.content,
            });

            const botResponse = {
                id: Date.now().toString(),
                role: "assistant",
                content: response.data.answer || "Sorry, I couldn't get an answer.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botResponse]);
        } catch (error) {
            console.error("Chat error:", error);
            const errorResponse = {
                id: Date.now().toString(),
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsLoading(false);
            // Ensure focus returns to input after response
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const formatTimestamp = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="flex flex-col h-[600px] lg:h-[700px] w-full glassmorphic-card overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex items-start gap-3 message-bubble",
                            message.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        {message.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Bot size={18} className="text-white" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[85%] lg:max-w-[75%] rounded-2xl px-4 py-3 shadow-md",
                                message.role === "user"
                                    ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-sm"
                                    : "glassmorphic-card rounded-bl-sm"
                            )}
                        >
                            <div className={cn(
                                "text-sm leading-relaxed prose prose-sm max-w-none",
                                message.role === "user"
                                    ? "prose-invert"
                                    : "dark:prose-invert"
                            )}>
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            <p className={cn(
                                "text-xs mt-2 opacity-70",
                                message.role === "user" ? "text-white" : "text-muted-foreground"
                            )}>
                                {formatTimestamp(message.timestamp)}
                            </p>
                        </div>
                        {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-lg">
                                <User size={18} className="text-white" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start message-bubble">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div className="glassmorphic-card rounded-bl-sm px-4 py-3 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 lg:p-6 border-t border-border/50 bg-background/30 backdrop-blur-sm">
                <div className="flex items-end gap-3">
                    <Textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask something about your uploaded documents…"
                        className="flex-1 resize-none bg-background/50 border-border/70 focus:ring-primary focus:border-primary min-h-[44px] max-h-[120px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        size="icon"
                        className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                    >
                        <Send size={20} />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
};
