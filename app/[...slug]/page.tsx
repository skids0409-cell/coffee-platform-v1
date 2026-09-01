import Platform from "../ui/Platform";
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const p=await params;return <Platform path={'/'+p.slug.join('/')}/>}
