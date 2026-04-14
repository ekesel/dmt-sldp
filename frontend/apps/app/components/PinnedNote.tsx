import { Clock3, Pin } from "lucide-react";

interface PinnedNoteProps {
  content?: string[];
  author?: string;
  role?: string;
  updatedAt?: string;
  priorityDescription?: string;
}

const PinnedNote = ({
  content = [
    "This quarter we are focusing on sharper collaboration, faster decisions, and clearer ownership across teams. The intranet should help everyone stay aligned on what matters most and make daily work easier.",
    "Thank you for the energy you bring to each launch, handoff, and customer milestone. Small improvements in how we share information have a big impact on how we operate together."
  ],
  author = "Aarav Mehta",
  role = "CEO",
  updatedAt = "2 hours ago",
  priorityDescription = "Top-of-mind priorities for the week"
}: PinnedNoteProps): JSX.Element => {
  return (
    <div className="relative h-full -rotate-[1deg] rounded-[20px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,247,237,0.9))] p-6 shadow-[0_16px_26px_-24px_rgba(245,158,11,0.55)]">
      
      {/* Pin Icon */}
      <div className="pointer-events-none absolute -top-4 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/80 bg-[radial-gradient(circle_at_30%_30%,#ffffff,#fbbf24)] text-amber-700 shadow-[0_10px_18px_-10px_rgba(146,64,14,0.75)]">
        <Pin className="h-4 w-4" />
      </div>

      <div className="flex h-full flex-col justify-between">
        
        {/* Top Content */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pinned note
          </div>

          <div className="space-y-3">
            <div className="h-1 w-20 rounded-full bg-amber-300/80" />

            <div className="space-y-4">
              {content.map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-relaxed text-slate-700 font-medium">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-end justify-between gap-3 border-t border-amber-100/90 pt-4">
          <div>
            <p className="text-base font-bold text-slate-900">{author}, {role}</p>
            <p className="text-[13px] font-medium text-amber-700/85">
              {priorityDescription}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/80 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
            <Clock3 className="h-4 w-4" />
            Updated {updatedAt}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PinnedNote;
