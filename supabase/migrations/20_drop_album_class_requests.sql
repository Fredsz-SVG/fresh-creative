-- Drop album_class_requests table (replaced by album_join_requests)
-- The new system uses album_join_requests for universal registration
-- and album_class_access for approved students

-- Drop table (CASCADE will drop all dependent policies and indexes)
DROP TABLE IF EXISTS public.album_class_requests CASCADE;
