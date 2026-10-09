"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import clsx from "clsx";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { ProjectAvatar, TEAM_LABEL } from "components/ui/kit";
import { projectBase, sendJson } from "./hooks";

export const PROJECT_COLORS = ["#0f766e", "#1d4ed8", "#6d28d9", "#be185d", "#b91c1c", "#c2410c", "#a16207", "#15803d", "#0e7490", "#52525b"];

const inputClass =
  "h-9 w-full rounded-md border border-tk-border bg-tk-surface px-3 text-sm focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface";

// Form identitas project (dipakai saat membuat project dan di Settings).
export function ProjectIdentityFields({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  icon,
  setIcon,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  icon: string;
  setIcon: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="project-name" className="mb-1 block text-sm font-semibold">
          Project name
        </label>
        <input id="project-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required placeholder="Manage Service Lintasarta" className={inputClass} />
      </div>
      <div>
        <label htmlFor="project-desc" className="mb-1 block text-sm font-semibold">
          Description <span className="font-normal text-tk-muted dark:text-tk-dark-muted">(optional)</span>
        </label>
        <textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="What is this project for?"
          className="w-full rounded-md border border-tk-border bg-tk-surface px-3 py-2 text-sm focus:border-tk-accent focus:outline-hidden focus:ring-2 focus:ring-tk-accent/20 dark:border-tk-dark-border dark:bg-tk-dark-surface"
        />
      </div>
      <div>
        <span className="mb-1 block text-sm font-semibold">Icon and color</span>
        <div className="flex flex-wrap items-center gap-4">
          <ProjectAvatar name={name || "Project"} color={color} icon={icon || null} size={44} />
          <input
            value={icon}
            onChange={(e) => setIcon(Array.from(e.target.value).slice(-2).join(""))}
            placeholder="Letter or emoji"
            aria-label="Project icon"
            className="h-9 w-32 rounded-md border border-tk-border bg-tk-surface px-3 text-sm focus:border-tk-accent focus:outline-hidden dark:border-tk-dark-border dark:bg-tk-dark-surface"
          />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Project color">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={clsx("flex h-7 w-7 items-center justify-center rounded-md ring-offset-2 ring-offset-tk-bg dark:ring-offset-tk-dark-bg", color === c && "ring-2 ring-tk-text dark:ring-tk-dark-text")}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-tk-muted dark:text-tk-dark-muted">Leave the icon empty to use the first letter of the name.</p>
      </div>
    </div>
  );
}

export default function ProjectForm({ team }: { team: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [icon, setIcon] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { project } = await sendJson("/api/projects", "POST", { name, description, color, icon, team });
      await mutate("/api/me/projects");
      toast.success(`Project ${project.name} created`);
      router.push(`${projectBase(project)}/issues`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create project");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <ProjectIdentityFields
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        color={color}
        setColor={setColor}
        icon={icon}
        setIcon={setIcon}
      />
      <div className="rounded-md border border-tk-divider bg-tk-subtle px-3 py-2 text-sm text-tk-muted dark:border-tk-dark-divider dark:bg-tk-dark-subtle dark:text-tk-dark-muted">
        The project is created in the <span className="font-semibold">{TEAM_LABEL[team] ?? team}</span> team. You&apos;ll be its owner and can
        add members from any team.
      </div>
      <div className="flex gap-2 border-t border-tk-divider pt-5 dark:border-tk-dark-divider">
        <button type="submit" disabled={submitting || !name.trim()} className="h-9 rounded-md bg-tk-accent px-4 text-sm font-medium text-white hover:bg-tk-accent-hover disabled:opacity-60">
          {submitting ? "Creating..." : "Create project"}
        </button>
        <Link href={`/dashboard/${team}/project`} className="inline-flex h-9 items-center rounded-md border border-tk-border px-4 text-sm hover:bg-tk-subtle dark:border-tk-dark-border dark:hover:bg-tk-dark-subtle">
          Cancel
        </Link>
      </div>
    </form>
  );
}
