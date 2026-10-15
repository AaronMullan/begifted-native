-- app_opened and notification_opened are usage signals for retention analysis,
-- logged on every open and tap. Forwarding them would cost an edge-function
-- call and a Customer.io event each, and add noise to the email journeys, so
-- the product_events trigger skips them. To let a journey react to one, drop
-- that event from this list rather than removing the guard.
DROP TRIGGER IF EXISTS customerio_sync_on_product_event ON public.product_events;
CREATE TRIGGER customerio_sync_on_product_event
  AFTER INSERT ON public.product_events
  FOR EACH ROW
  WHEN (NEW.event_name NOT IN ('app_opened', 'notification_opened'))
  EXECUTE FUNCTION public.notify_customerio_sync();
