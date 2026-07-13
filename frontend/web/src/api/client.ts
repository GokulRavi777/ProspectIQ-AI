import createClient from "openapi-fetch";
import type { paths } from "./schema";

const baseUrl = import.meta.env.VITE_API_URL || "";
const client = createClient<paths>({ baseUrl });

export default client;
