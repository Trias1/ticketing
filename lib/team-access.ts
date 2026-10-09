export const PROJECT_TEAMS = ["cloud", "devops", "pm"] as const;

export type ProjectTeam = (typeof PROJECT_TEAMS)[number];

export type TeamUser = {
  role: string;
  team: string;
  access?: string[] | null;
};

export function isProjectTeam(team: string | null | undefined): team is ProjectTeam {
  return !!team && PROJECT_TEAMS.includes(team as ProjectTeam);
}

export function getAllowedProjectTeams(user: TeamUser): ProjectTeam[] {
  if (user.role === "admin") return [...PROJECT_TEAMS];

  const ownTeam = isProjectTeam(user.team) ? [user.team] : [];
  const accessTeams = user.access?.filter(isProjectTeam) ?? [];

  return [...new Set([...ownTeam, ...accessTeams])];
}

// Staff membuat project di timnya sendiri; akses lintas tim diatur lewat member project.
export function getCreatableProjectTeams(user: TeamUser): ProjectTeam[] {
  if (user.role === "admin") return [];
  return isProjectTeam(user.team) ? [user.team] : [];
}

export function canAccessProjectTeam(user: TeamUser, team: string | null | undefined) {
  return getAllowedProjectTeams(user).includes(team as ProjectTeam);
}

export function canCreateProjectForTeam(user: TeamUser, team: string | null | undefined) {
  return getCreatableProjectTeams(user).includes(team as ProjectTeam);
}
