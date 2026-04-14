import LatestNews from "@/components/latest-news/LatestNews";

export default function LatestNewsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight sm:text-5xl">
                    Latest News
                </h1>
                <p className="mt-4 text-lg text-muted-foreground tracking-wide">
                    Stay up-to-date with company announcements and team updates!
                </p>
            </div>
            
            <div className="flex justify-center w-full">
                <div className="w-full">
                    <LatestNews />
                </div>
            </div>
        </div>
    );
}
