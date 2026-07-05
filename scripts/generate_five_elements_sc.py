#!/usr/bin/env python3
"""Generate simplified-Chinese five-elements crystal infographic carousel."""

import math
import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = "/Users/michaelng/.cursor/projects/Users-michaelng-Desktop-HarmoniqFengShui-FengShuiLayout/assets"
FONT_PATH = "/Users/michaelng/Desktop/HarmoniqFengShui/FengShuiLayout/assets/fonts/NotoSerifSC.ttf"
OUT_DIR = "/Users/michaelng/Desktop/wuxing-crystal-guide-sc"

os.makedirs(OUT_DIR, exist_ok=True)

SIZE = (1080, 1350)
W, H = SIZE

FONT_COVER = ImageFont.truetype(FONT_PATH, 96)
FONT_H1 = ImageFont.truetype(FONT_PATH, 75)
FONT_H2 = ImageFont.truetype(FONT_PATH, 55)
FONT_LABEL = ImageFont.truetype(FONT_PATH, 28)
FONT_BODY = ImageFont.truetype(FONT_PATH, 38)
FONT_TEXT = ImageFont.truetype(FONT_PATH, 36)
FONT_SMALL = ImageFont.truetype(FONT_PATH, 28)

ELEMENTS = [
    {
        "id": "wood",
        "name": "木五行",
        "subtitle": "绿色、青绿色",
        "main_color": (27, 102, 70),
        "symbolism": "生长、生机、舒展之力，与东方、春季相关。",
        "effect": "促进身心稳定，激发创造力，改善人际关系与事业成长。",
        "crystals": ["绿幽灵", "绿兔毛", "绿发晶", "绿草莓", "绿水晶", "葡萄石", "橄榄石", "绿方解", "绿龙晶", "孔雀石", "绿碧玺", "绿玉髓"],
        "hero_img": "hero_wood.png",
        "beads": ["wood_bead_1.png", "wood_bead_2.png", "wood_bead_3.png", "wood_bead_4.png"],
    },
    {
        "id": "fire",
        "name": "火五行",
        "subtitle": "红色、紫色、粉色、橙色",
        "main_color": (187, 54, 35),
        "symbolism": "热情、活力、变革之力，与南方、夏季相关。",
        "effect": "激发行动力与勇气，增强自信，促进人际互动与魅力。",
        "crystals": ["红发晶", "红胶花", "马粉", "莫粉", "金太阳", "紫幽灵", "紫发晶", "乌拉圭紫水晶", "巴西紫水晶", "玻利维亚紫", "红幽灵", "红超七"],
        "hero_img": "hero_fire.png",
        "beads": ["fire_bead_1.png", "fire_bead_2.png", "fire_bead_3.png", "fire_bead_4.png"],
    },
    {
        "id": "earth",
        "name": "土五行",
        "subtitle": "黄色、棕色、咖啡色",
        "main_color": (164, 116, 28),
        "symbolism": "稳定、包容、承载之力，与中央方位、四季交替相关。",
        "effect": "稳定情绪、增强耐心，提升踏实感，助力财富累积。",
        "crystals": ["黄水晶", "橙黄水晶", "黄方解石", "铜发晶", "蜜蜡", "黄玛瑙", "黄虎眼", "黄兔毛", "黄龙玉", "黄胶花", "黄幽灵", "黄碧玺"],
        "hero_img": "hero_earth.png",
        "beads": ["earth_bead_1.png", "earth_bead_2.png", "earth_bead_3.png", "earth_bead_4.png"],
    },
    {
        "id": "metal",
        "name": "金五行",
        "subtitle": "白色、金色、银色",
        "main_color": (110, 110, 115),
        "symbolism": "收敛、净化、决断之力，与西方、秋季相关。",
        "effect": "提升逻辑与判断力，化解混乱思绪，助力事业与财富规划。",
        "crystals": ["白水晶", "白幽灵", "白阿塞", "白玛瑙", "白翡翠", "白松石", "欧泊", "和田白玉", "白萤石", "白月光", "白兔毛", "喜马拉雅白"],
        "hero_img": "hero_metal.png",
        "beads": ["metal_bead_1.png", "metal_bead_2.png", "metal_bead_3.png", "metal_bead_4.png"],
    },
    {
        "id": "water",
        "name": "水五行",
        "subtitle": "黑色、深蓝色、透明色",
        "main_color": (40, 92, 146),
        "symbolism": "流动、智慧、柔韧之力，与北方、冬季相关。",
        "effect": "舒缓压力，提升直觉与沟通力，改善情绪与思绪卡点。",
        "crystals": ["黑曜石", "金曜石", "黑骨干", "黑银钛", "蓝晶石", "蓝月光", "蓝发晶", "海蓝宝", "蓝虎眼", "地狱海蓝宝", "黑发晶", "银曜石"],
        "hero_img": "hero_water.png",
        "beads": ["water_bead_1.png", "water_bead_2.png", "water_bead_3.png", "water_bead_4.png"],
    },
]


def draw_centered(draw, text, y, font, fill):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)


def remove_white_bg(img, tolerance=240):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img


def process_bead(filepath, size=90):
    if not os.path.exists(filepath):
        return None
    img = Image.open(filepath).convert("RGBA")
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) / 2
    top = (h - min_dim) / 2
    img = img.crop((left, top, left + min_dim, top + min_dim))
    img = remove_white_bg(img)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def process_center_hero(filepath, size=460):
    if not os.path.exists(filepath):
        return None
    img = Image.open(filepath).convert("RGBA")
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) / 2
    top = (h - min_dim) / 2
    img = img.crop((left, top, left + min_dim, top + min_dim))
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    img.putalpha(mask)
    return img


def draw_element_slide(config, filename):
    img = Image.new("RGB", SIZE, (249, 248, 246))
    draw = ImageDraw.Draw(img)

    title_text = f"{config['name']} | {config['subtitle']}"
    draw_centered(draw, title_text, 60, FONT_H2, config["main_color"])
    draw.line((150, 140, W - 150, 140), fill=(220, 215, 210), width=2)

    cx, cy = 540, 595
    ring_radius = 320
    bead_size = 96

    hero_path = os.path.join(ASSETS_DIR, config["hero_img"])
    hero_img = process_center_hero(hero_path, size=440)
    if hero_img:
        img.paste(hero_img, (cx - 220, cy - 220), hero_img)

    bead_imgs = []
    for b in config["beads"]:
        bp = os.path.join(ASSETS_DIR, b)
        b_img = process_bead(bp, size=bead_size)
        if b_img:
            bead_imgs.append(b_img)

    n = len(config["crystals"])
    for i, name in enumerate(config["crystals"]):
        angle = -math.pi / 2 + i * (2 * math.pi / n)
        x = int(cx + ring_radius * math.cos(angle))
        y = int(cy + ring_radius * math.sin(angle))

        if bead_imgs:
            base_bead = bead_imgs[i % len(bead_imgs)]
            rotated_bead = base_bead.rotate(i * 77, expand=False, resample=Image.Resampling.BICUBIC)
            img.paste(rotated_bead, (x - bead_size // 2, y - bead_size // 2), rotated_bead)

        label_r = ring_radius + 75
        lx = int(cx + label_r * math.cos(angle))
        ly = int(cy + label_r * math.sin(angle))

        bbox = draw.textbbox((0, 0), name, font=FONT_LABEL)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        if math.cos(angle) > 0.1:
            lx = lx - tw / 2 + 15
        elif math.cos(angle) < -0.1:
            lx = lx - tw / 2 - 15
        else:
            lx = lx - tw / 2

        draw.text((lx, ly - th / 2), name, font=FONT_LABEL, fill=(60, 50, 40))

    box_top = 1050
    draw.rounded_rectangle((60, box_top, W - 60, H - 80), radius=30, fill=(255, 255, 255), outline=(230, 225, 215), width=2)
    draw.text((100, box_top + 35), f"象征：{config['symbolism']}", font=FONT_TEXT, fill=(80, 70, 60))

    effect_text = f"作用：{config['effect']}"
    words = effect_text.split("，")
    line1 = words[0] + "，" + words[1] + "，"
    line2 = words[2] if len(words) > 2 else ""
    draw.text((100, box_top + 95), line1, font=FONT_TEXT, fill=(80, 70, 60))
    if line2:
        draw.text((100, box_top + 155), line2, font=FONT_TEXT, fill=(80, 70, 60))

    draw_centered(draw, "www.harmoniqfengshui.com", H - 55, FONT_SMALL, (160, 150, 140))
    img.save(os.path.join(OUT_DIR, filename), quality=95)
    print("Saved", filename)


def draw_cover():
    img = Image.new("RGB", SIZE, (249, 248, 246))
    draw = ImageDraw.Draw(img)

    draw_centered(draw, "五行适合什么水晶？", 120, FONT_COVER, (60, 50, 40))
    draw.line((120, 250, W - 120, 250), fill=(220, 215, 210), width=2)

    start_x = 80
    gap = 190
    y = 420
    size = 160

    for i, config in enumerate(ELEMENTS):
        x = start_x + i * gap
        hero_path = os.path.join(ASSETS_DIR, config["hero_img"])
        hero_img = process_center_hero(hero_path, size=size)
        if hero_img:
            img.paste(hero_img, (x, y), hero_img)
        t = config["name"][0]
        tw = draw.textlength(t, font=FONT_H1)
        draw.text((x + size / 2 - tw / 2, y + size + 30), t, font=FONT_H1, fill=config["main_color"])

    draw.rounded_rectangle((80, 720, W - 80, 1120), radius=30, fill=(255, 255, 255), outline=(230, 225, 215), width=2)
    tips = [
        "这组内容帮你快速看懂：",
        "1. 每个五行对应的水晶色系",
        "2. 五行能量象征与日常作用",
        "3. 你现在应该优先补哪一行",
        "4. 如何用颜色先做入门搭配",
    ]
    yy = 780
    for line in tips:
        draw.text((130, yy), line, font=FONT_BODY, fill=(80, 70, 60))
        yy += 65

    draw_centered(draw, "收藏这篇，选水晶不再乱买", 1170, FONT_BODY, (120, 100, 80))
    draw_centered(draw, "www.harmoniqfengshui.com", H - 55, FONT_SMALL, (160, 150, 140))
    img.save(os.path.join(OUT_DIR, "01_cover.jpg"), quality=95)
    print("Saved 01_cover.jpg")


def draw_endcard():
    img = Image.new("RGB", SIZE, (249, 248, 246))
    draw = ImageDraw.Draw(img)
    draw_centered(draw, "下一步怎么选？", 200, FONT_H1, (60, 50, 40))

    draw.rounded_rectangle((80, 350, W - 80, 950), radius=30, fill=(255, 255, 255), outline=(230, 225, 215), width=2)
    bullets = [
        "先看你最近最困扰：财运 / 情绪 / 人际 / 事业",
        "再用五行颜色选 1-2 颗先戴 7 天",
        "观察睡眠、情绪与工作状态变化",
        "有需要再进一步做个人化搭配",
    ]
    y = 450
    for b in bullets:
        draw.text((130, y), f"• {b}", font=FONT_BODY, fill=(80, 70, 60))
        y += 110

    draw_centered(draw, "我们商店有售同款水晶", 1050, FONT_BODY, (140, 100, 60))
    draw_centered(draw, "购买即赠专属八字运势分析报告", 1120, FONT_BODY, (180, 80, 80))
    draw_centered(draw, "www.harmoniqfengshui.com", H - 55, FONT_SMALL, (160, 150, 140))
    img.save(os.path.join(OUT_DIR, "07_endcard.jpg"), quality=95)
    print("Saved 07_endcard.jpg")


def main():
    draw_cover()
    draw_element_slide(ELEMENTS[0], "02_wood.jpg")
    draw_element_slide(ELEMENTS[1], "03_fire.jpg")
    draw_element_slide(ELEMENTS[2], "04_earth.jpg")
    draw_element_slide(ELEMENTS[3], "05_metal.jpg")
    draw_element_slide(ELEMENTS[4], "06_water.jpg")
    draw_endcard()
    print(f"All slides saved to {OUT_DIR}")


if __name__ == "__main__":
    main()
