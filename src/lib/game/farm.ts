/**
 * Stage farming: the slayer walks right through a stage's 10 waves of monsters and then a box. Every
 * monster stands 1 range apart, with 10 empty range between waves; the slayer stops to fight whatever
 * is in reach and walks on once nothing is.
 */

export type FarmStage = { stage: number; name: string; mobs: number; enemyHp: number; bossHp: number };

export const FARM_WAVES = 10;
/** Empty range before the first wave and between waves. */
export const WAVE_GAP = 10;
/** Range walked a second, before movement speed bonuses. */
export const MOVE_SPEED = 5;
/** A basic attack reaches the monster right in front. */
export const BASIC_RANGE = 1;

export type FieldEnemy = { id: number; position: number; hp: number; maxHp: number; wave: number; box: boolean };

export type FieldState = { position: number; enemies: FieldEnemy[]; kills: number; cleared: boolean; total: number };

export type Field = {
  /** The nearest monster still standing, or null once the box is broken. */
  front: () => FieldEnemy | null;
  /** Whether anything standing is within this range ahead. */
  inRange: (range: number) => boolean;
  /** Deals `amount` to every monster within range (only the front one when `single`); what they lost in all. */
  hit: (amount: number, range: number, single?: boolean) => number;
  /** Walks right, stopping at the front monster's reach. */
  move: (distance: number) => void;
  /** Where the farthest monster still standing within range is, or null when none is. */
  farthest: (range: number) => number | null;
  /** Charges right to a position; monsters still standing that it passes are carried along, just ahead of the slayer. */
  dash: (to: number) => void;
  kills: () => number;
  cleared: () => boolean;
  state: () => FieldState;
};

/** The stage's monsters: `mobs` a wave for 10 waves, then a box with a monster's HP. */
export function createField(stage: FarmStage): Field {
  const enemies: FieldEnemy[] = [];
  let position = 0;
  let at = WAVE_GAP;
  let id = 0;
  for (let wave = 1; wave <= FARM_WAVES; wave += 1) {
    for (let m = 0; m < Math.max(1, stage.mobs); m += 1) {
      enemies.push({ id: id++, position: at, hp: stage.enemyHp, maxHp: stage.enemyHp, wave, box: false });
      at += 1;
    }
    at += WAVE_GAP;
  }
  enemies.push({ id: id++, position: at, hp: stage.enemyHp, maxHp: stage.enemyHp, wave: FARM_WAVES + 1, box: true });

  let kills = 0;
  const standing = () => enemies.filter((e) => e.hp > 0);
  const front = () => standing()[0] ?? null;
  const reach = (range: number) => standing().filter((e) => Math.abs(e.position - position) <= range);
  const damage = (enemy: FieldEnemy, amount: number) => {
    const lost = Math.min(enemy.hp, Math.max(0, amount));
    enemy.hp -= lost;
    if (enemy.hp <= 0) kills += 1;
    return lost;
  };

  return {
    front,
    inRange: (range) => reach(range).length > 0,
    hit: (amount, range, single = false) => {
      const targets = single ? reach(range).slice(0, 1) : reach(range);
      return targets.reduce((total, enemy) => total + damage(enemy, amount), 0);
    },
    move: (distance) => {
      const next = front();
      position = next ? Math.max(position, Math.min(position + distance, next.position - BASIC_RANGE)) : position + distance;
    },
    farthest: (range) => {
      const targets = reach(range);
      return targets.length ? Math.max(...targets.map((e) => e.position)) : null;
    },
    dash: (to) => {
      position = Math.max(position, to);
      for (const e of standing()) if (e.position < position + BASIC_RANGE) e.position = position + BASIC_RANGE;
    },
    kills: () => kills,
    cleared: () => front() === null,
    state: () => ({
      position,
      enemies: enemies.map((e) => ({ ...e })),
      kills,
      cleared: front() === null,
      total: enemies.reduce((sum, e) => sum + (e.maxHp - e.hp), 0),
    }),
  };
}
