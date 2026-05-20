package com.blockforge.cooler_blackrobe_curios.item;

public enum AccessorySlot {
    BACK("back", "背部"),
    RING("ring", "戒指"),
    NECKLACE("necklace", "项链"),
    BELT("belt", "腰带"),
    CHARM("charm", "护符");

    private final String curiosTag;
    private final String zhLabel;

    AccessorySlot(String curiosTag, String zhLabel) {
        this.curiosTag = curiosTag;
        this.zhLabel = zhLabel;
    }

    public String curiosTag() {
        return curiosTag;
    }

    public String zhLabel() {
        return zhLabel;
    }
}
