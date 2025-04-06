export async function jsonRequest(method: string, endpoint: string, body: any = null) {
    const request: RequestInit = {
        method: method,
        headers: {"Content-Type": "application/json"},
    };
    if (body !== null) {
        request.body = JSON.stringify(body);
    }

    const response = await fetch(`/api${endpoint}`, request);
    if (response.status != 200) {
        throw Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
}