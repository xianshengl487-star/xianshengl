package com.blockforge.ice_wand_demo.logic;

import java.util.*;

public class Cooldowns {
    private static final Map<String, Long> DATA = new HashMap<>();
    private static String key(UUID player, String id) { return player.toString() + ":" + id; }
    public static boolean ready(UUID player, String id, long now) { return now >= DATA.getOrDefault(key(player, id), 0L); }
    public static void start(UUID player, String id, long expiresAtGameTime) { DATA.put(key(player, id), expiresAtGameTime); }
}
