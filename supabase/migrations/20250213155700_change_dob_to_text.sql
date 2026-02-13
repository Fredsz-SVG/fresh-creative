-- Change date_of_birth from date to text to support "Place, Date" format
ALTER TABLE public.album_class_access ALTER COLUMN date_of_birth TYPE text;
