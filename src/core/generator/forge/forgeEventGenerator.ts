import type { BlockForgeIR, IRStep, LogicVariable } from '../../../shared/types/logic';

function javaString(value: unknown): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

function constantName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
}

function javaIdentifier(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_]/g, '_');
  return `bf_${/^[0-9]/.test(safe) ? `_${safe}` : safe}`;
}

function variableById(variables: LogicVariable[], id: unknown): LogicVariable | undefined {
  return variables.find(variable => variable.id === String(id || ''));
}

function exactVariableRef(value: unknown, variables: LogicVariable[]): LogicVariable | undefined {
  const text = String(value ?? '').trim();
  const id = text.startsWith('var:')
    ? text.slice(4)
    : text.match(/^\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/)?.[1];
  return id ? variableById(variables, id) : undefined;
}

function variableLiteral(variable: LogicVariable | undefined, value: unknown): string {
  if (!variable) return '0';
  if (variable.type === 'boolean') return String(value) === 'true' ? 'true' : 'false';
  if (variable.type === 'string') return `"${javaString(value)}"`;
  const number = Number(value || 0);
  return Number.isFinite(number) ? String(number) : '0';
}

function variableDeclaration(variable: LogicVariable): string {
  const name = javaIdentifier(variable.id);
  if (variable.type === 'boolean') return `        boolean ${name} = ${variableLiteral(variable, variable.defaultValue)};`;
  if (variable.type === 'string') return `        String ${name} = ${variableLiteral(variable, variable.defaultValue)};`;
  return `        double ${name} = ${variableLiteral(variable, variable.defaultValue)};`;
}

function variableStringExpr(variable: LogicVariable): string {
  const name = javaIdentifier(variable.id);
  return variable.type === 'string' ? name : `String.valueOf(${name})`;
}

function stringExpr(value: unknown, variables: LogicVariable[]): string {
  const exact = exactVariableRef(value, variables);
  if (exact) return variableStringExpr(exact);
  const text = String(value ?? '');
  const parts: string[] = [];
  const matcher = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(text)) !== null) {
    if (match.index > cursor) parts.push(`"${javaString(text.slice(cursor, match.index))}"`);
    const variable = variableById(variables, match[1]);
    parts.push(variable ? variableStringExpr(variable) : `"${javaString(match[0])}"`);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(`"${javaString(text.slice(cursor))}"`);
  return parts.length ? parts.join(' + ') : '""';
}

function numberExpr(value: unknown, variables: LogicVariable[], fallback = 0): string {
  const variable = exactVariableRef(value, variables);
  if (variable && variable.type === 'number') return javaIdentifier(variable.id);
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? String(number) : String(fallback);
}

function booleanExpr(value: unknown, variables: LogicVariable[], fallback = false): string {
  const variable = exactVariableRef(value, variables);
  if (variable && variable.type === 'boolean') return javaIdentifier(variable.id);
  if (String(value).toLowerCase() === 'true') return 'true';
  if (String(value).toLowerCase() === 'false') return 'false';
  return fallback ? 'true' : 'false';
}

function variableCondition(variable: LogicVariable | undefined, value: unknown, operator: 'equals' | 'gte', variables: LogicVariable[]): string {
  if (!variable) return 'false';
  const name = javaIdentifier(variable.id);
  if (operator === 'gte') {
    return `${name} >= ${numberExpr(value, variables, 0)}`;
  }
  if (variable.type === 'string') return `${name}.equals(${stringExpr(value, variables)})`;
  if (variable.type === 'boolean') return `${name} == ${booleanExpr(value, variables, false)}`;
  return `${name} == ${numberExpr(value, variables, 0)}`;
}

function indentCode(code: string, spaces: number) {
  const pad = ' '.repeat(spaces);
  return code.split('\n').map(line => `${pad}${line}`).join('\n');
}

function branchToJava(steps: IRStep[] | undefined, variables: LogicVariable[]) {
  return steps?.length ? steps.map(child => stepToJava(child, variables)).join('\n') : '            // 无动作';
}

function nbtKey(step: IRStep) {
  return javaString(step.args.key || 'blockforge_tag');
}

function actionToJava(step: IRStep, variables: LogicVariable[]): string {
  const variable = variableById(variables, step.args.variable);
  if (step.kind === 'send_message') return `player.sendSystemMessage(net.minecraft.network.chat.Component.literal(${stringExpr(step.args.text || 'Hello', variables)}));`;
  if (step.kind === 'consume_xp_level') return `player.giveExperienceLevels(-((int) (${numberExpr(step.args.amount, variables, 1)})));`;
  if (step.kind === 'execute_command') return `if (player.getServer() != null) player.getServer().getCommands().performPrefixedCommand(player.createCommandSourceStack(), ${stringExpr(step.args.command || 'say hello', variables)});`;
  if (step.kind === 'start_cooldown') return `Cooldowns.start(player.getUUID(), ${stringExpr(step.args.cooldownId || 'default', variables)}, level.getGameTime() + (long) (${numberExpr(step.args.ticks, variables, 100)}));`;
  if (step.kind === 'consume_item') return `BlockForgeItemUtils.consume(player, ${stringExpr(step.args.item || 'minecraft:stick', variables)}, Math.max(0, (int) (${numberExpr(step.args.count, variables, 1)})));`;
  if (step.kind === 'variable_set') {
    if (!variable) return '// TODO variable not found';
    if (variable.type === 'string') return `${javaIdentifier(variable.id)} = ${stringExpr(step.args.value, variables)};`;
    if (variable.type === 'boolean') return `${javaIdentifier(variable.id)} = ${booleanExpr(step.args.value, variables, false)};`;
    return `${javaIdentifier(variable.id)} = ${numberExpr(step.args.value, variables, 0)};`;
  }
  if (step.kind === 'variable_add') {
    return variable ? `${javaIdentifier(variable.id)} = ${javaIdentifier(variable.id)} + ${numberExpr(step.args.amount, variables, 1)};` : '// TODO variable not found';
  }
  if (step.kind === 'nbt_set_string') return `event.getItemStack().getOrCreateTag().putString("${nbtKey(step)}", ${stringExpr(step.args.value, variables)});`;
  if (step.kind === 'nbt_set_number') return `event.getItemStack().getOrCreateTag().putDouble("${nbtKey(step)}", ${numberExpr(step.args.value, variables, 0)});`;
  if (step.kind === 'nbt_set_boolean') return `event.getItemStack().getOrCreateTag().putBoolean("${nbtKey(step)}", ${booleanExpr(step.args.value, variables, false)});`;
  if (step.kind === 'nbt_remove') return `if (event.getItemStack().hasTag()) event.getItemStack().getTag().remove("${nbtKey(step)}");`;
  if (step.kind === 'give_item') return `BlockForgeGameActions.giveItem(player, ${stringExpr(step.args.item || 'minecraft:diamond', variables)}, Math.max(1, (int) (${numberExpr(step.args.count, variables, 1)})));`;
  if (step.kind === 'give_effect') return `BlockForgeGameActions.giveEffect(player, ${stringExpr(step.args.effect || 'minecraft:speed', variables)}, Math.max(1, (int) (${numberExpr(step.args.seconds, variables, 5)})), Math.max(0, (int) (${numberExpr(step.args.amplifier, variables, 1)})));`;
  if (step.kind === 'play_sound') return `BlockForgeGameActions.playSound(level, player.blockPosition(), ${stringExpr(step.args.sound || 'minecraft:block.amethyst_block.chime', variables)}, (float) (${numberExpr(step.args.volume, variables, 1)}), (float) (${numberExpr(step.args.pitch, variables, 1)}));`;
  if (step.kind === 'spawn_particle') return `BlockForgeGameActions.spawnParticle(level, player.position(), ${stringExpr(step.args.particle || 'minecraft:enchanted_hit', variables)}, Math.max(1, (int) (${numberExpr(step.args.count, variables, 16)})));`;
  if (step.kind === 'set_block') return `BlockForgeGameActions.setBlock(level, player.blockPosition().below(), ${stringExpr(step.args.block || 'minecraft:ice', variables)});`;
  if (step.kind === 'summon_entity') return `BlockForgeGameActions.summonEntity(level, player.blockPosition(), ${stringExpr(step.args.entityType || 'minecraft:snow_golem', variables)}, Math.max(1, (int) (${numberExpr(step.args.count, variables, 1)})));`;
  return `// TODO unsupported action: ${step.kind}`;
}

function stepToJava(step: IRStep, variables: LogicVariable[]): string {
  if (step.op === 'action') return indentCode(actionToJava(step, variables), 8);
  if (step.kind === 'player_xp_level_at_least') return `        if (player.experienceLevel >= (int) (${numberExpr(step.args.level, variables, 10)})) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'cooldown_ready') return `        if (Cooldowns.ready(player.getUUID(), ${stringExpr(step.args.cooldownId || 'default', variables)}, level.getGameTime())) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'player_has_item') return `        if (BlockForgeItemUtils.has(player, ${stringExpr(step.args.item || 'minecraft:stick', variables)}, Math.max(0, (int) (${numberExpr(step.args.count, variables, 1)})))) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'block_is') return `        if (BlockForgeGameActions.isBlock(level, player.blockPosition().below(), ${stringExpr(step.args.block || 'minecraft:stone', variables)})) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'biome_is') return `        if (BlockForgeGameActions.isBiome(level, player.blockPosition(), ${stringExpr(step.args.biome || 'minecraft:plains', variables)})) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'entity_type_is') return `        if (BlockForgeGameActions.isEntityType(player, ${stringExpr(step.args.entityType || 'minecraft:player', variables)})) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'variable_equals') {
    const variable = variableById(variables, step.args.variable);
    return `        if (${variableCondition(variable, step.args.value, 'equals', variables)}) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  }
  if (step.kind === 'variable_greater_or_equal') {
    const variable = variableById(variables, step.args.variable);
    return `        if (${variableCondition(variable, step.args.value, 'gte', variables)}) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  }
  if (step.kind === 'nbt_has_key') return `        if (event.getItemStack().hasTag() && event.getItemStack().getTag().contains("${nbtKey(step)}")) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'nbt_string_equals') return `        if (event.getItemStack().hasTag() && (${stringExpr(step.args.value, variables)}).equals(event.getItemStack().getTag().getString("${nbtKey(step)}"))) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  if (step.kind === 'nbt_number_gte') return `        if (event.getItemStack().hasTag() && event.getItemStack().getTag().getDouble("${nbtKey(step)}") >= ${numberExpr(step.args.value, variables, 0)}) {\n${branchToJava(step.then, variables)}\n        } else {\n${branchToJava(step.else, variables)}\n        }`;
  return `        // TODO unsupported condition: ${step.kind}`;
}

export function generateForgeEventHandler(packageName: string, ir: BlockForgeIR): string {
  const target = ir.event.target?.startsWith('item:') ? ir.event.target.split(':')[1] : undefined;
  const targetGuard = target ? `        if (!event.getItemStack().is(${packageName}.registry.ModItems.${constantName(target)}.get())) return;\n` : '';
  const variables = ir.variables || [];
  const variableCode = variables.length ? `${variables.map(variableDeclaration).join('\n')}\n` : '';
  return `package ${packageName}.logic;\n\nimport net.minecraftforge.event.entity.player.PlayerInteractEvent;\nimport net.minecraftforge.eventbus.api.SubscribeEvent;\nimport net.minecraftforge.fml.common.Mod;\nimport net.minecraft.world.entity.player.Player;\nimport net.minecraft.world.level.Level;\n\n@Mod.EventBusSubscriber\npublic class GeneratedEventHandlers {\n    @SubscribeEvent\n    public static void onRightClickItem(PlayerInteractEvent.RightClickItem event) {\n        Player player = event.getEntity();\n        Level level = event.getLevel();\n        if (level.isClientSide) return;\n${targetGuard}${variableCode}${ir.steps.map(step => stepToJava(step, variables)).join('\n')}\n    }\n}\n`;
}

export function generateCooldowns(packageName: string): string {
  return `package ${packageName}.logic;\n\nimport java.util.*;\n\npublic class Cooldowns {\n    private static final Map<String, Long> DATA = new HashMap<>();\n    private static String key(UUID player, String id) { return player.toString() + ":" + id; }\n    public static boolean ready(UUID player, String id, long now) { return now >= DATA.getOrDefault(key(player, id), 0L); }\n    public static void start(UUID player, String id, long expiresAtGameTime) { DATA.put(key(player, id), expiresAtGameTime); }\n}\n`;
}

export function generateItemUtils(packageName: string): string {
  return `package ${packageName}.logic;\n\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.entity.player.Player;\nimport net.minecraft.world.item.ItemStack;\nimport net.minecraftforge.registries.ForgeRegistries;\n\npublic class BlockForgeItemUtils {\n    public static boolean has(Player player, String itemId, int count) {\n        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));\n        if (item == null) return false;\n        int found = 0;\n        for (ItemStack stack : player.getInventory().items) {\n            if (stack.is(item)) found += stack.getCount();\n            if (found >= count) return true;\n        }\n        return false;\n    }\n\n    public static void consume(Player player, String itemId, int count) {\n        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));\n        if (item == null || player.isCreative()) return;\n        int remaining = count;\n        for (ItemStack stack : player.getInventory().items) {\n            if (!stack.is(item)) continue;\n            int taken = Math.min(remaining, stack.getCount());\n            stack.shrink(taken);\n            remaining -= taken;\n            if (remaining <= 0) return;\n        }\n    }\n}\n`;
}

export function generateGameActions(packageName: string): string {
  return `package ${packageName}.logic;\n\nimport net.minecraft.core.BlockPos;\nimport net.minecraft.core.particles.ParticleTypes;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.server.level.ServerLevel;\nimport net.minecraft.sounds.SoundSource;\nimport net.minecraft.world.effect.MobEffectInstance;\nimport net.minecraft.world.entity.EntityType;\nimport net.minecraft.world.entity.player.Player;\nimport net.minecraft.world.item.ItemStack;\nimport net.minecraft.world.level.Level;\nimport net.minecraftforge.registries.ForgeRegistries;\n\npublic class BlockForgeGameActions {\n    public static void giveItem(Player player, String itemId, int count) {\n        var item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(itemId));\n        if (item != null) player.addItem(new ItemStack(item, count));\n    }\n\n    public static void giveEffect(Player player, String effectId, int seconds, int amplifier) {\n        var effect = ForgeRegistries.MOB_EFFECTS.getValue(new ResourceLocation(effectId));\n        if (effect != null) player.addEffect(new MobEffectInstance(effect, seconds * 20, amplifier));\n    }\n\n    public static void playSound(Level level, BlockPos pos, String soundId, float volume, float pitch) {\n        var sound = ForgeRegistries.SOUND_EVENTS.getValue(new ResourceLocation(soundId));\n        if (sound != null) level.playSound(null, pos, sound, SoundSource.PLAYERS, volume, pitch);\n    }\n\n    public static void spawnParticle(Level level, net.minecraft.world.phys.Vec3 pos, String particleId, int count) {\n        if (level instanceof ServerLevel serverLevel) {\n            serverLevel.sendParticles(ParticleTypes.ENCHANTED_HIT, pos.x, pos.y + 1, pos.z, count, 0.4, 0.4, 0.4, 0.05);\n        }\n    }\n\n    public static void setBlock(Level level, BlockPos pos, String blockId) {\n        var block = ForgeRegistries.BLOCKS.getValue(new ResourceLocation(blockId));\n        if (block != null) level.setBlock(pos, block.defaultBlockState(), 3);\n    }\n\n    public static void summonEntity(Level level, BlockPos pos, String entityId, int count) {\n        if (!(level instanceof ServerLevel serverLevel)) return;\n        EntityType<?> type = ForgeRegistries.ENTITY_TYPES.getValue(new ResourceLocation(entityId));\n        if (type == null) return;\n        for (int i = 0; i < count; i++) {\n            var entity = type.create(serverLevel);\n            if (entity != null) {\n                entity.moveTo(pos.getX() + 0.5, pos.getY() + 1, pos.getZ() + 0.5);\n                serverLevel.addFreshEntity(entity);\n            }\n        }\n    }\n\n    public static boolean isBlock(Level level, BlockPos pos, String blockId) {\n        var block = ForgeRegistries.BLOCKS.getValue(new ResourceLocation(blockId));\n        return block != null && level.getBlockState(pos).is(block);\n    }\n\n    public static boolean isBiome(Level level, BlockPos pos, String biomeId) {\n        return level.getBiome(pos).unwrapKey().map(key -> key.location().equals(new ResourceLocation(biomeId))).orElse(false);\n    }\n\n    public static boolean isEntityType(net.minecraft.world.entity.Entity entity, String entityId) {\n        var key = ForgeRegistries.ENTITY_TYPES.getKey(entity.getType());\n        return key != null && key.equals(new ResourceLocation(entityId));\n    }\n}\n`;
}
