import type { Messages } from "..";

const m: Messages["team"] = {
  titleAgency: "Team & permissions",
  titleContractor: "Team",
  heading: "Team & permissions",
  sub: "Everyone signs in with their own Google account. What they can do depends on their role.",
  you: "you",
  role: "Role",
  remove: "Remove",
  invited: "Invited · joins on first Google sign-in",
  matrix: "What each role can do",
  perm: "Permission",
  email: "Email address",
  invite: "Invite to team",
  errors: {
    email: "That email address isn't valid",
    role: "That role isn't valid",
    otherOrg: "This user already belongs to another organization. Please contact support.",
  },
  joined: "{email} has joined the team",
  sent: "Invitation sent to {email}. It activates on their first Google sign-in.",
};
export default m;
