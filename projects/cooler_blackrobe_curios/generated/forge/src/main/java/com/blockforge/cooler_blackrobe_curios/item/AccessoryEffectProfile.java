package com.blockforge.cooler_blackrobe_curios.item;

public enum AccessoryEffectProfile {
    NONE("数值增幅"),
    SHADOW("夜幕潜行"),
    SUN("日焰灼辉"),
    DEPTH("深潮呼吸"),
    STORM("风暴护持"),
    VOID("虚空回响"),
    REGEN_SHIELD("再生护盾"),
    CHRONO_PULSE("时序脉冲"),
    PHASE_STEP("相位踏步"),
    BLOOD_SURGE("血脉沸腾"),
    SERVO_SHIELD("伺服护盾");

    private final String zhLabel;

    AccessoryEffectProfile(String zhLabel) {
        this.zhLabel = zhLabel;
    }

    public String zhLabel() {
        return zhLabel;
    }
}
