package com.blockforge.homelander_maomao.client;

import com.blockforge.homelander_maomao.HomelanderMaomaoMod;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayers;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.monster.Monster;

public class VoughtHumanoidRenderer<T extends Monster> extends HumanoidMobRenderer<T, HumanoidModel<T>> {
    private final ResourceLocation texture;
    private final float modelScale;

    public VoughtHumanoidRenderer(EntityRendererProvider.Context context, String textureName, float shadowRadius, float modelScale) {
        super(context, new HumanoidModel<>(context.bakeLayer(ModelLayers.PLAYER)), shadowRadius);
        this.texture = new ResourceLocation(HomelanderMaomaoMod.MODID, "textures/entity/" + textureName + ".png");
        this.modelScale = modelScale;
    }

    @Override
    protected void scale(T entity, PoseStack poseStack, float partialTickTime) {
        poseStack.scale(modelScale, modelScale, modelScale);
    }

    @Override
    public ResourceLocation getTextureLocation(T entity) {
        return texture;
    }
}
