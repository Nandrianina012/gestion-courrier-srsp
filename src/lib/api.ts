const apiBaseFromEnvironment = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

export const API =
	apiBaseFromEnvironment ??
	(typeof window === "undefined"
		? "http://127.0.0.1:8000"
		: `${window.location.protocol}//${window.location.hostname}:8000`);
