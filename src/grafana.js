import { config } from "./config.js";

const sendGrafanaSilence = async (alert, start, end = new Date(0)) => {
    

    if (!config.GRAFANA_URL || !config.GRAFANA_API_KEY) {
        console.error('Grafana config missing, cannot silence');
        return false;
    }

    if (end < start) {
        end = start + 24 * 60 * 60 * 1000;
    }

    const matchers = Object.entries(alert.labels).map(([name, value]) => ({
        name,
        value,
        isRegex: false,
        isEqual: true
    }));

    const payload = {
        matchers,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        createdBy: "Grafana2Matrix",
        comment: `Silenced via Matrix for 24h`
    };
    

    try {
        const response = await fetch(`${config.GRAFANA_URL}/api/alertmanager/grafana/api/v2/silences`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Authorization': `Bearer ${config.GRAFANA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Grafana response:', errorData);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Failed to create silence:', error.message);
    }
    
}

export { sendGrafanaSilence };