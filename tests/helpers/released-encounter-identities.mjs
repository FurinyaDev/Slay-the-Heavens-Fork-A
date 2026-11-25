// Identities changed by the approved #951 text update. Apply these to frozen
// test expectations only, and keep the original artwork and vectors intact.
const releasedIds=new Map([
 ['cultist','raven_adept'],['blue_slaver','blue_guard'],['red_slaver','red_guard'],
]);

export const currentEnemyId=id=>releasedIds.get(id)??id;
