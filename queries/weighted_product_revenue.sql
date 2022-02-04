with bundle_revenue AS (
	SELECT
	  PrimaryTiQAccountName
	  ,"ARR(converted)" AS revenue
	  ,Product
	from sf_data 
	where Product LIKE "%Bundle%"
	--and PrimaryTiQAccountName is not null
)
, activation AS (
SELECT
	account
	, sum(
FROM  
	
)
select * from activation





, bundles_with_weights AS (
SELECT
b.*
, w.bundle_component
, w.weight
, sum(w.weight) over(PARTITION BY b.PrimaryTiQAccountName, b.revenue) weight_total
from bundle_revenue b 
join bundle_weights w 
on b.Product = w.bundle_name
)
SELECT
	*
	, (revenue/weight_total)*weight AS product_revenue
from  
	bundles_with_weights