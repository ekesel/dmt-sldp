import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 text-center">
            <div className="space-y-4">
                <div className="text-9xl font-extrabold text-primary/20">404</div>
                <h1 className="text-4xl font-bold tracking-tight">Page Not Found</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    The page you are looking for might have been moved, deleted, or does not exist in the administrative dashboard.
                </p>
                <div className="pt-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all font-semibold shadow-lg shadow-primary/20"
                    >
                        <Home size={20} />
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
