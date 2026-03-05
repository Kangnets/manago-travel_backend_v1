-- users 테이블 데이터 전부 삭제 (테이블 구조는 유지)
-- 사용법: psql mango_travel -f scripts/reset-users.sql
-- 또는 psql 접속 후 \i scripts/reset-users.sql

DELETE FROM users;

-- 삭제된 행 수 확인 (선택)
-- SELECT COUNT(*) FROM users;
