#!/usr/bin/env python3
"""
アイコンファイル生成スクリプト
PIL/Pillowを使用してアイコンを生成
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: PIL/Pillow is not installed.")
    print("Please install it with: pip install Pillow")
    exit(1)

import os

def draw_icon(size):
    """アイコンを描画する関数"""
    # 画像を作成（透明背景）
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    padding = int(size * 0.1)
    center_x = size // 2
    center_y = size // 2
    
    # 背景（グラデーション風の単色）
    bg_color = (74, 144, 226, 255)  # #4a90e2
    draw.rectangle([0, 0, size, size], fill=bg_color)
    
    # 角丸の白い背景
    white_rect = [padding, padding, size - padding, size - padding]
    corner_radius = int(size * 0.15)
    draw.rounded_rectangle(white_rect, radius=corner_radius, fill=(255, 255, 255, 255))
    
    # 画面の枠を描画（スクリーンショットを表現）
    screen_padding = int(size * 0.2)
    screen_rect = [screen_padding, screen_padding, size - screen_padding, size - screen_padding]
    draw.rectangle(screen_rect, outline=(51, 51, 51, 255), width=max(1, int(size * 0.03)))
    
    # 画面内に小さな四角（コンテンツを表現）
    content_padding = int(size * 0.25)
    content_rect = [content_padding, content_padding, size - content_padding, size - content_padding]
    draw.rectangle(content_rect, fill=(224, 224, 224, 255))
    
    # 注釈を表す矢印を描画（右上から）
    arrow_start_x = int(size * 0.65)
    arrow_start_y = int(size * 0.25)
    arrow_end_x = int(size * 0.8)
    arrow_end_y = int(size * 0.15)
    
    arrow_color = (255, 59, 48, 255)  # #ff3b30
    line_width = max(2, int(size * 0.04))
    
    # 矢印の線
    draw.line([(arrow_start_x, arrow_start_y), (arrow_end_x, arrow_end_y)], 
              fill=arrow_color, width=line_width)
    
    # 矢印の先端（三角形）
    import math
    angle = math.atan2(arrow_end_y - arrow_start_y, arrow_end_x - arrow_start_x)
    arrow_length = int(size * 0.08)
    arrow_angle = math.pi / 6
    
    # 三角形の3つの頂点
    tip_x = arrow_end_x
    tip_y = arrow_end_y
    left_x = int(arrow_end_x - arrow_length * math.cos(angle - arrow_angle))
    left_y = int(arrow_end_y - arrow_length * math.sin(angle - arrow_angle))
    right_x = int(arrow_end_x - arrow_length * math.cos(angle + arrow_angle))
    right_y = int(arrow_end_y - arrow_length * math.sin(angle + arrow_angle))
    
    draw.polygon([(tip_x, tip_y), (left_x, left_y), (right_x, right_y)], fill=arrow_color)
    
    # 番号を表す丸（左下）
    circle_x = int(size * 0.3)
    circle_y = int(size * 0.75)
    circle_radius = int(size * 0.08)
    
    # 円を描画
    circle_bbox = [circle_x - circle_radius, circle_y - circle_radius,
                   circle_x + circle_radius, circle_y + circle_radius]
    draw.ellipse(circle_bbox, fill=arrow_color)
    
    # 数字を描画
    try:
        font_size = max(8, int(size * 0.12))
        # システムフォントを試す
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # テキストを中央揃えで描画
    text = "1"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    text_x = circle_x - text_width // 2
    text_y = circle_y - text_height // 2
    
    draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

def generate_icons():
    """アイコンファイルを生成"""
    # iconsディレクトリが存在しない場合は作成
    icons_dir = './icons'
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    sizes = [16, 48, 128]
    
    for size in sizes:
        img = draw_icon(size)
        filename = f'{icons_dir}/icon{size}.png'
        img.save(filename, 'PNG')
        print(f'✓ Generated {filename} ({size}x{size}px)')
    
    print('\n✅ All icon files generated successfully!')

if __name__ == '__main__':
    try:
        generate_icons()
    except Exception as e:
        print(f'Error generating icons: {e}')
        exit(1)

