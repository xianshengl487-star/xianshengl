package com.blockforge.cooler_blackrobe_curios.item;

import com.blockforge.cooler_blackrobe_curios.CoolerBlackrobeCuriosMod;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AccessoryCatalog {
    private static final String RESOURCE_PATH = "data/cooler_blackrobe_curios/accessories.json";
    private static final Gson GSON = new GsonBuilder().create();
    private static final Type LIST_TYPE = new TypeToken<List<AccessorySpec>>() {}.getType();

    public static final List<AccessorySpec> ALL = load();
    public static final Map<String, AccessorySpec> BY_ID = buildIndex(ALL);

    private AccessoryCatalog() {
    }

    public static AccessorySpec get(String id) {
        return BY_ID.get(id);
    }

    private static List<AccessorySpec> load() {
        InputStream inputStream = CoolerBlackrobeCuriosMod.class.getClassLoader().getResourceAsStream(RESOURCE_PATH);
        if (inputStream == null) {
            throw new IllegalStateException("Missing accessory catalog: " + RESOURCE_PATH);
        }
        try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
            List<AccessorySpec> entries = GSON.fromJson(reader, LIST_TYPE);
            if (entries == null || entries.isEmpty()) {
                throw new IllegalStateException("Accessory catalog is empty: " + RESOURCE_PATH);
            }
            return Collections.unmodifiableList(entries);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to load accessory catalog", ex);
        }
    }

    private static Map<String, AccessorySpec> buildIndex(List<AccessorySpec> entries) {
        Map<String, AccessorySpec> index = new LinkedHashMap<>();
        for (AccessorySpec entry : entries) {
            index.put(entry.id(), entry);
        }
        return Collections.unmodifiableMap(index);
    }
}
