BEGIN TRANSACTION;

DELETE FROM reviews
WHERE userName LIKE '[시드]%'
   OR productTitle IN (
     '푸꾸옥 얼리버드 리조트 특가',
     '푸꾸옥 선셋 크루즈 세일',
     '푸꾸옥 남부섬 호핑 초특가',
     '푸꾸옥 빈원더스+사파리 콤보',
     '푸꾸옥 오션뷰 골프 18홀 특가',
     '푸꾸옥 프리미엄 골프+셔틀',
     '푸꾸옥 공항 픽업 왕복',
     '푸꾸옥 패밀리 리조트 4박',
     '푸꾸옥 프라이빗 요트투어',
     '푸꾸옥 북부 힐링 데이투어'
   );

DELETE FROM products
WHERE title IN (
  '푸꾸옥 얼리버드 리조트 특가',
  '푸꾸옥 선셋 크루즈 세일',
  '푸꾸옥 남부섬 호핑 초특가',
  '푸꾸옥 빈원더스+사파리 콤보',
  '푸꾸옥 오션뷰 골프 18홀 특가',
  '푸꾸옥 프리미엄 골프+셔틀',
  '푸꾸옥 공항 픽업 왕복',
  '푸꾸옥 패밀리 리조트 4박',
  '푸꾸옥 프라이빗 요트투어',
  '푸꾸옥 북부 힐링 데이투어'
);

INSERT INTO products (
  title,
  description,
  location,
  country,
  duration,
  price,
  originalPrice,
  imageUrl,
  category,
  isActive,
  isFeatured,
  viewCount,
  minParticipants,
  maxParticipants
) VALUES
(
  '푸꾸옥 얼리버드 리조트 특가',
  '인기 리조트 조식 포함 + 공항 픽업',
  '푸꾸옥',
  '푸꾸옥',
  '3박 4일',
  399000,
  650000,
  'https://images.unsplash.com/photo-1605537964076-3cb0ea2ff329?auto=format&fit=crop&w=1200&q=80',
  'hotel',
  1,
  1,
  256,
  1,
  8
),
(
  '푸꾸옥 선셋 크루즈 세일',
  '선셋 타임 크루즈 + 웰컴 드링크 포함',
  '푸꾸옥',
  '푸꾸옥',
  '4시간',
  79000,
  129000,
  'https://images.unsplash.com/photo-1567115220168-93d296e55a0a?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  1,
  311,
  1,
  20
),
(
  '푸꾸옥 남부섬 호핑 초특가',
  '스노클링 + 점심 포함 호핑 투어',
  '푸꾸옥',
  '푸꾸옥',
  '8시간',
  89000,
  149000,
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  1,
  287,
  1,
  18
),
(
  '푸꾸옥 빈원더스+사파리 콤보',
  '빈원더스/사파리 1일 입장권 콤보',
  '푸꾸옥',
  '푸꾸옥',
  '1일',
  119000,
  149000,
  'https://images.unsplash.com/photo-1702529985429-19019b5fdc6d?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  1,
  204,
  1,
  30
),
(
  '푸꾸옥 오션뷰 골프 18홀 특가',
  '그린피 + 카트 + 왕복 셔틀 포함',
  '푸꾸옥',
  '푸꾸옥',
  '18홀',
  189000,
  259000,
  'https://images.unsplash.com/photo-1758551932752-a9c603e25146?auto=format&fit=crop&w=1200&q=80',
  'golf',
  1,
  1,
  340,
  1,
  4
),
(
  '푸꾸옥 프리미엄 골프+셔틀',
  '프리미엄 코스 라운딩 + 클럽하우스 식사',
  '푸꾸옥',
  '푸꾸옥',
  '18홀',
  229000,
  299000,
  'https://images.unsplash.com/photo-1766288020088-4b95f5409376?auto=format&fit=crop&w=1200&q=80',
  'golf',
  1,
  1,
  298,
  1,
  4
),
(
  '푸꾸옥 공항 픽업 왕복',
  '공항-리조트 왕복 전용차량 이동',
  '푸꾸옥',
  '푸꾸옥',
  '왕복',
  39000,
  59000,
  'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  0,
  121,
  1,
  10
),
(
  '푸꾸옥 패밀리 리조트 4박',
  '워터파크 포함 패밀리 룸 특가',
  '푸꾸옥',
  '푸꾸옥',
  '4박 5일',
  599000,
  780000,
  'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80',
  'hotel',
  1,
  0,
  177,
  2,
  6
),
(
  '푸꾸옥 프라이빗 요트투어',
  '프라이빗 요트 + 선셋 포토타임',
  '푸꾸옥',
  '푸꾸옥',
  '5시간',
  149000,
  209000,
  'https://images.unsplash.com/photo-1703555853329-b9fab31e92ad?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  1,
  262,
  1,
  8
),
(
  '푸꾸옥 북부 힐링 데이투어',
  '북부 해변 + 카페 + 로컬마켓 투어',
  '푸꾸옥',
  '푸꾸옥',
  '7시간',
  69000,
  99000,
  'https://images.unsplash.com/photo-1713551584263-9881fefc5ad7?auto=format&fit=crop&w=1200&q=80',
  'tour',
  1,
  1,
  188,
  1,
  20
);

INSERT INTO reviews (
  productId,
  productTitle,
  rating,
  comment,
  images,
  userName,
  isActive
) VALUES
(
  (SELECT id FROM products WHERE title = '푸꾸옥 얼리버드 리조트 특가' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 얼리버드 리조트 특가',
  4.9,
  '룸 컨디션이 좋아서 가족여행으로 만족했습니다. 공항 픽업도 정확했어요.',
  '[]',
  '[시드]김서윤',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 선셋 크루즈 세일' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 선셋 크루즈 세일',
  5.0,
  '노을 타이밍이 완벽했고 스태프가 친절했습니다. 사진도 정말 잘 나와요.',
  '[]',
  '[시드]박지훈',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 남부섬 호핑 초특가' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 남부섬 호핑 초특가',
  4.8,
  '스노클링 포인트가 좋고 장비 상태도 깔끔했습니다.',
  '[]',
  '[시드]최유진',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 빈원더스+사파리 콤보' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 빈원더스+사파리 콤보',
  4.7,
  '아이랑 함께 가기 최고예요. 하루 코스로 알차게 돌았습니다.',
  '[]',
  '[시드]이도윤',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 오션뷰 골프 18홀 특가' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 오션뷰 골프 18홀 특가',
  4.9,
  '코스 관리가 좋아서 라운딩 만족도 높았습니다. 셔틀도 편했어요.',
  '[]',
  '[시드]정민호',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 프리미엄 골프+셔틀' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 프리미엄 골프+셔틀',
  4.8,
  '클럽하우스 식사 퀄리티도 좋아서 재예약 의향 있습니다.',
  '[]',
  '[시드]한지민',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 공항 픽업 왕복' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 공항 픽업 왕복',
  4.6,
  '새벽 도착이었는데 기사님 연락이 잘 되어 안심됐습니다.',
  '[]',
  '[시드]송예린',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 패밀리 리조트 4박' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 패밀리 리조트 4박',
  4.7,
  '워터파크 접근성이 좋아서 아이들이 정말 좋아했어요.',
  '[]',
  '[시드]강태윤',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 프라이빗 요트투어' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 프라이빗 요트투어',
  5.0,
  '기념일 여행으로 선택했는데 분위기 최고였습니다.',
  '[]',
  '[시드]임하늘',
  1
),
(
  (SELECT id FROM products WHERE title = '푸꾸옥 북부 힐링 데이투어' ORDER BY created DESC LIMIT 1),
  '푸꾸옥 북부 힐링 데이투어',
  4.8,
  '동선이 여유롭고 가이드 설명이 좋아서 만족했어요.',
  '[]',
  '[시드]오준혁',
  1
);

COMMIT;
