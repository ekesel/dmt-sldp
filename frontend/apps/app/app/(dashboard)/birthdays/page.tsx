import UpcomingBirthdaysUI from "@/components/upcoming-birthdays/UpcomingBirthdaysUI";

export default function BirthdaysPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                    Celebrations
                </h1>
                <p className="mt-4 text-lg text-gray-500">
                    Stay connected with the team and never miss a birthday!
                </p>
            </div>
            
            <div className="flex justify-center">
                <UpcomingBirthdaysUI />
            </div>
        </div>
    );
}
