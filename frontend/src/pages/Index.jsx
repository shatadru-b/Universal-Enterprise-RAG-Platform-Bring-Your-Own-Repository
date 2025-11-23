import { FileUpload } from "../components/FileUpload";
import { ChatInterface } from "../components/ChatInterface";
import { ThemeToggle } from "../components/ThemeToggle";

const Index = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 transition-colors duration-500">
            <div className="container mx-auto px-4 py-6 lg:py-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-8 lg:mb-12 animate-fade-in">
                    <div className="space-y-2">
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                            <span className="gradient-text">Universal Enterprise RAG Platform</span>
                        </h1>
                        <p className="text-muted-foreground text-base lg:text-lg max-w-2xl">
                            Upload your documents and explore insights through AI-driven conversation.
                        </p>
                    </div>
                    <ThemeToggle />
                </header>

                {/* Main Content - Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 animate-slide-up">
                    {/* Left Column - File Upload */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                                <span className="text-primary">📁</span>
                                Upload Documents
                            </h2>
                        </div>
                        <FileUpload />
                        <div className="glassmorphic-card p-4">
                            <p className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">💡</span>
                                <span>
                                    You can upload multiple documents. The AI will reference all uploaded files when answering your questions.
                                </span>
                            </p>
                        </div>
                    </section>

                    {/* Right Column - Chat Assistant */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                                <span className="text-secondary">💬</span>
                                Chat Assistant
                            </h2>
                        </div>
                        <ChatInterface />
                    </section>
                </div>

                {/* Footer Helper Text */}
                <footer className="mt-12 text-center animate-fade-in">
                    <p className="text-xs text-muted-foreground">
                        Powered by advanced RAG technology • Enterprise-grade document intelligence
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default Index;
