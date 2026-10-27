import type { Messages } from "..";

const m: Messages["team"] = {
  titleAgency: "Team and permissions",
  titleContractor: "Team",
  heading: "Team and permissions",
  sub: "Each person signs in with their own Google account. Their role sets what they can do.",
  you: "you",
  role: "Role",
  remove: "Remove",
  invited: "Invited · joins at first sign-in with Google",
  matrix: "What each role can do",
  perm: "Permission",
  email: "Email address",
  invite: "Invite to team",
  errors: {
    email: "The email address is not valid",
    role: "The role is not valid",
    otherOrg: "This user already belongs to another organization. Contact Yadaim support.",
  },
  joined: "{email} has joined the team",
  sent: "Invitation sent to {email}. It takes effect when they first sign in with Google.",
};
export default m;
