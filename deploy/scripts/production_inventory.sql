SELECT CONCAT('db_size_mb=', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2))
FROM information_schema.tables WHERE table_schema = DATABASE();
SELECT CONCAT('tables=', COUNT(*))
FROM information_schema.tables WHERE table_schema = DATABASE();
SELECT CONCAT(
    table_name,
    '|rows=', table_rows,
    '|data_mb=', ROUND(data_length / 1024 / 1024, 2),
    '|index_mb=', ROUND(index_length / 1024 / 1024, 2)
)
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY data_length + index_length DESC
LIMIT 15;
SHOW VARIABLES WHERE Variable_name IN (
    'max_connections',
    'innodb_buffer_pool_size',
    'slow_query_log',
    'long_query_time',
    'max_allowed_packet'
);
SHOW GLOBAL STATUS WHERE Variable_name IN (
    'Threads_connected',
    'Threads_running',
    'Max_used_connections',
    'Slow_queries',
    'Created_tmp_disk_tables',
    'Created_tmp_tables',
    'Innodb_row_lock_waits',
    'Innodb_row_lock_time'
);
