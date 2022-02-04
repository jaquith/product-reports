WITH cdh_products AS (
SELECT
account 
, sum(case when audienceDBEnabled = 1 and volume_audiencedb_visitors_180_days > 0 THEN 1 ELSE 0 END) AS audience_db_enabled
, sum(case when audienceStoreEnabled = 1 and volume_audiencestore_visitors_180_days > 0 THEN 1 ELSE 0 END) AS audience_store_enabled
, sum(case when audienceStreamEnabled = 1 and volume_audiencestream_filtered_events_180_days > 0 THEN 1 ELSE 0 END) AS audience_stream_enabled
, sum(case when eventDBEnabled = 1 and volume_eventdb_events_180_days > 0 THEN 1 ELSE 0 END) AS event_db_enabled
, sum(case when eventStoreEnabled = 1 and volume_eventstore_events_180_days > 0 THEN 1 ELSE 0 END) AS event_store_enabled
, sum(case when eventStreamEnabled = 1 and volume_cloud_connector_events_180_days > 0 THEN 1 ELSE 0 END) AS event_stream_enabled
, sum(case when volume_predict_enrichments_180_days > 0 THEN 1 ELSE 0 END) AS predict_enabled
from cdh_profiles
group by 1
)
, tiq_products AS (
SELECT
	account 
	, sum(case when loader_180_days > 0 or mobile_180_days > 0 THEN 1 ELSE 0 END) AS tiq_enabled
from  
	iq_profiles
GROUP BY 1
)
, left_join AS (
select 
	c.*
	, t.tiq_enabled
FROM 
cdh_products c 
LEFT JOIN 
tiq_products t 
on c.account = t.account
)
, right_join as (
select 
	t.account 
	, c.audience_db_enabled
	, c.audience_store_enabled
	, c.audience_stream_enabled
	, c.event_db_enabled
	, c.event_store_enabled
	, c.event_stream_enabled
	, c.predict_enabled
	, t.tiq_enabled
from  
	tiq_products t 
left join 
	cdh_products c 
on  
	t.account = c.account
)
SELECT * from left_join 
UNION 
SELECT * from right_join 

