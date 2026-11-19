"use client";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {readModelFavorites,subscribeToModelFavorites,writeModelFavorites} from "@/lib/model-favorites";
import {matchesModelSearch,parseModelSearchTerms} from "@/lib/model-search";
import {
  firstSortDirection,formatElo,formatEloInterval,formatPercentile,personalityColumns,personalityLevelHref,personalityPage,personalityPageSize,
  resolvePersonalityLevel,resolvePersonalitySort,sortPersonalityModels,
  type PersonalityColumn,type PersonalityDataset,type PersonalityLevel,
} from "@/lib/personality";
import {ProviderMultiSelect,providerSelectionLabel} from "@/components/ui/provider-multi-select";
import {Drawer} from "@/components/ui/drawer";
import {Alert,Button,Card,HelperText,IconButton,Input,LinkButton,Pagination,Select,Table,TableScroll} from "@/components/ui/primitives";

// Break points for long words, so narrow score headers wrap at a hyphen instead of spilling into the next column.
const HEADER_BREAKS:Record<string,string>={
  Expressiveness:"Expres\u00adsiveness",
  Organization:"Organi\u00adzation",
  Informativeness:"Informa\u00adtiveness",
  Transparency:"Transpar\u00adency",
  Imagination:"Imagi\u00adnation",
  Conviction:"Convic\u00adtion",
  Percentile:"Percen\u00adtile",
  Metaphorical:"Meta\u00adphorical",
  Structured:"Struc\u00adtured",
  Scannable:"Scan\u00adnable",
  Information:"Infor\u00admation",
  Uncertainty:"Uncer\u00adtainty",
  Assumptions:"Assump\u00adtions",
  Sycophantic:"Syco\u00adphantic",
  Intelligent:"Intel\u00adligent",
  Emotionally:"Emotion\u00adally",
  Confident:"Confi\u00addent",
  Opinionated:"Opinion\u00adated",
  Constructive:"Construc\u00adtive",
  Pushback:"Push\u00adback",
};
const LEGEND="Percentiles are rounded to whole numbers; sorting uses AA’s exact values. Missing values show as “—” and sort last.";
const headerLabel=(label:string)=>label.split(" ").map(word=>HEADER_BREAKS[word]??word).join(" ");

function PersonalitySearch({value,onCommit}:{value:string;onCommit:(value:string)=>void}){
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value]);
  useEffect(()=>{
    const next=draft.slice(0,200);
    if(next===value)return;
    const timer=window.setTimeout(()=>onCommit(next),300);
    return()=>window.clearTimeout(timer);
  },[draft,value,onCommit]);
  return <div className="toolbar-model-search"><label className="text-caption text-secondary font-semibold md:sr-only" htmlFor="personality-search">Search models</label><Input id="personality-search" aria-describedby="personality-search-help" value={draft} placeholder="Search model names…" onChange={event=>setDraft(event.target.value.slice(0,200))}/><HelperText id="personality-search-help">Separate keywords with commas, e.g. sol, haiku.</HelperText></div>;
}

/** What the level means: index descriptions, trait definitions, or one trait's definition and its links. */
function LevelNotes({dataset,level,levelHref}:{dataset:PersonalityDataset;level:PersonalityLevel;levelHref:(index?:string,trait?:string)=>string}){
  if(level.kind==="all") return <>
    <p>Each index is a percentile from 1 to 100 across every model AA tested; higher means more of it. Open an index for its traits.</p>
    <dl className="personality-definitions" style={{"--personality-definition-columns":4} as CSSProperties}>{dataset.indexes.map(index=><div key={index.key}><dt>{index.label}{index.traits.length===1&&index.traits[0].lower_is_better?" · ↓ lower is better":""}</dt><dd>{index.description}.</dd></div>)}</dl>
  </>;
  if(level.kind==="index") return <>
    <p>{level.index.description}. The index is the mean of its {level.index.traits.length} traits, as a percentile from 1 to 100 · {level.index.question_count} questions.</p>
    <dl className="personality-definitions" style={{"--personality-definition-columns":Math.min(5,level.index.traits.length)} as CSSProperties}>{level.index.traits.map(trait=><div key={trait.key}><dt>{trait.label}{trait.lower_is_better?" · ↓ lower is better":""}</dt><dd>{trait.definition}</dd></div>)}</dl>
  </>;
  return <>
    <p>{level.trait.definition}{level.trait.lower_is_better?" ↓ lower is better.":""}</p>
    <p>Part of <Link href={levelHref(level.index.key)}>{level.index.label}</Link>{level.index.traits.length===1?" (its only trait)":""} · Percentile from 1 to 100; Elo is AA’s Bradley-Terry score with its 95% interval · <a href={level.trait.source_url} target="_blank" rel="noreferrer">{level.trait.label} on Artificial Analysis ↗</a></p>
  </>;
}

const describeLevel=(level:PersonalityLevel)=>level.kind==="all"?"all":level.kind==="index"?level.index.key:`${level.index.key}/${level.trait.key}`;

export default function PersonalityLeaderboard({dataset}:{dataset:PersonalityDataset}){
  const params=useSearchParams(),router=useRouter();
  const [favorites,setFavorites]=useState<string[]>([]),[favoriteNotice,setFavoriteNotice]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  useEffect(()=>{const refresh=()=>setFavorites(readModelFavorites());refresh();return subscribeToModelFavorites(refresh);},[]);
  const level=useMemo(()=>resolvePersonalityLevel(dataset,params.get("index"),params.get("trait")),[dataset,params]);
  const columns=useMemo(()=>personalityColumns(dataset,level),[dataset,level]);
  const {sort,direction}=resolvePersonalitySort(columns,params.get("s"),params.get("d"));
  const q=(params.get("q")??"").slice(0,200),favoritesOnly=params.get("f")==="1";
  const selectedProviders=useMemo(()=>[...new Set(params.getAll("p").filter(Boolean))],[params]);
  const selectedProviderSet=useMemo(()=>new Set(selectedProviders),[selectedProviders]);
  const [searchTerm,setSearchTerm]=useState(q);
  useEffect(()=>setSearchTerm(q),[q]);
  const searchTerms=useMemo(()=>parseModelSearchTerms(searchTerm),[searchTerm]);
  const size=personalityPageSize(params.get("z"));
  const sorted=useMemo(()=>sortPersonalityModels(dataset.models.filter(m=>(!selectedProviderSet.size||selectedProviderSet.has(m.provider))&&matchesModelSearch(m.name,searchTerms)&&(!favoritesOnly||favorites.includes(m.identity_key))),columns,sort,direction),[dataset,selectedProviderSet,searchTerms,favoritesOnly,favorites,columns,sort,direction]);
  const pages=Math.max(1,Math.ceil(sorted.length/size)),page=personalityPage(params.get("i"),pages);
  const pageRows=sorted.slice((page-1)*size,page*size);
  const activeFilterCount=selectedProviders.length+(favoritesOnly?1:0);
  const shareParams=new URLSearchParams(params.toString());
  if(searchTerm)shareParams.set("q",searchTerm);else shareParams.delete("q");
  const stateHref=`/personality${shareParams.size?`?${shareParams}`:""}`;
  const levelHref=(index?:string,trait?:string)=>personalityLevelHref(shareParams,index,trait);
  const update=useCallback((values:Record<string,string|number|string[]>,history:"push"|"replace"="replace")=>{const next=new URLSearchParams(window.location.search);next.set("i","1");for(const [k,v]of Object.entries(values)){next.delete(k);if(Array.isArray(v))v.forEach(value=>{if(value)next.append(k,value);});else if(v!=="")next.set(k,String(v));}const href=`/personality?${next}`;if(history==="push")router.push(href,{scroll:false});else router.replace(href,{scroll:false});},[router]);
  const commitSearch=useCallback((value:string)=>{
    setSearchTerm(value);
    const next=new URLSearchParams(window.location.search);
    next.set("i","1");
    if(value)next.set("q",value);else next.delete("q");
    window.history.replaceState(null,"",`/personality?${next}`);
  },[]);
  const toggleFavorite=(identity:string)=>{const next=favorites.includes(identity)?favorites.filter(id=>id!==identity):[...favorites,identity];if(writeModelFavorites(next)){setFavorites(next);setFavoriteNotice("");}else setFavoriteNotice("Favorites could not be saved in this browser.");};
  const clearFilters=()=>{setSearchTerm("");update({q:"",p:"",f:"",s:"",d:"",i:"",z:""});};
  const sortTo=(key:string)=>update({s:key,d:sort===key?(direction==="asc"?"desc":"asc"):firstSortDirection(columns,key)});
  const arrow=(key:string)=>sort===key?(direction==="asc"?"↑":"↓"):"↕";
  const ariaSort=(key:string)=>sort===key?(direction==="asc"?"ascending":"descending"):"none";
  const sortLabel=sort==="model"?"Model":sort==="provider"?"Provider":columns.find(c=>c.key===sort)?.label;
  const missingCount=columns.some(c=>c.key===sort)?sorted.filter(m=>columns.find(c=>c.key===sort)?.value(m)===null).length:0;
  const levelTitle=level.kind==="all"?"All indexes":level.kind==="index"?level.index.label:level.trait.label;
  const scoreHeader=(column:PersonalityColumn)=><th key={column.key} scope="col" className="numeric" data-column={column.key} aria-sort={ariaSort(column.key)}><Button variant="quiet" size="compact" onClick={()=>sortTo(column.key)}>{headerLabel(column.label)}{" "}{arrow(column.key)}<small>{column.detail}</small></Button></th>;
  const indexChips=[{key:"",label:"All indexes",current:level.kind==="all"},...dataset.indexes.map(index=>({key:index.key,label:index.label,current:level.kind!=="all"&&level.index.key===index.key}))];
  const traitChips=level.kind!=="all"&&level.index.traits.length>1?[{key:"",label:`${level.index.label} index`,current:level.kind==="index"},...level.index.traits.map(trait=>({key:trait.key,label:trait.label,current:level.kind==="trait"&&level.trait.key===trait.key}))]:[];
  const filterControls=(idPrefix:string,variant:"toolbar"|"drawer")=><>
    <label className="sr-only" htmlFor={`${idPrefix}personality-provider`}>Provider</label>
    <ProviderMultiSelect id={`${idPrefix}personality-provider`} className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"} label="Provider" providers={[...new Set(dataset.models.map(m=>m.provider))].sort()} selected={selectedProviders} onChange={providers=>update({p:providers},"push")}/>
    <label className="sr-only" htmlFor={`${idPrefix}personality-favorites`}>Favorite filter</label>
    <Select className={variant==="toolbar"?"master-model-filter master-desktop-only":"master-model-filter master-filter-drawer__control"} id={`${idPrefix}personality-favorites`} value={favoritesOnly?"favorites":"all"} onChange={e=>update({f:e.target.value==="favorites"?"1":""})}>
      <option value="all">All models</option><option value="favorites">Favorites only</option>
    </Select>
    <strong className={variant==="toolbar"?"master-favorite-count master-desktop-only":"master-filter-drawer__count"}>{favorites.length} favorite{favorites.length===1?"":"s"}</strong>
    <Button size="compact" variant="quiet" className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"} onClick={clearFilters}>Clear filters</Button>
    <LinkButton href={stateHref} variant="quiet" size="compact" className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"}>Link to this view</LinkButton>
  </>;
  // On a phone each chip row scrolls on its own; bring the current chip into view when the level changes.
  const chipsRef=useRef<HTMLElement>(null);
  const levelKey=describeLevel(level);
  useEffect(()=>{
    chipsRef.current?.querySelectorAll<HTMLElement>(".personality-chips").forEach(row=>{
      const chip=row.querySelector<HTMLElement>('[aria-current="true"]');
      if(!chip||row.scrollWidth<=row.clientWidth)return;
      row.scrollLeft+=chip.getBoundingClientRect().left-row.getBoundingClientRect().left-(row.clientWidth-chip.offsetWidth)/2;
    });
  },[levelKey]);
  const notes=<LevelNotes dataset={dataset} level={level} levelHref={levelHref}/>;
  return <Card id="personality-leaderboard" className={`master personality personality--${level.kind}`}>
    <nav ref={chipsRef} className="personality-levels" aria-label="Personality levels">
      <div className="personality-chips" aria-label="Indexes">{indexChips.map(chip=><LinkButton key={chip.key||"all"} href={levelHref(chip.key||undefined)} variant={chip.current?"primary":"secondary"} size="compact" aria-current={chip.current?"true":undefined}>{chip.label}</LinkButton>)}</div>
      {level.kind!=="all"&&traitChips.length>0&&<div className="personality-chips" aria-label={`${level.index.label} traits`}>{traitChips.map(chip=><LinkButton key={chip.key||"index"} href={levelHref(level.index.key,chip.key||undefined)} variant={chip.current?"primary":"secondary"} size="compact" aria-current={chip.current?"true":undefined}>{chip.label}</LinkButton>)}</div>}
    </nav>
    <h2>{levelTitle}</h2>
    <div className="master-intro personality-notes">{notes}</div>
    <div className="master-intro-mobile personality-notes"><details><summary>What these mean</summary>{notes}<p>{LEGEND} Search: separate keywords with commas, e.g. sol, haiku.</p></details></div>
    <div className="toolbar filter-toolbar master-toolbar">
      <PersonalitySearch value={searchTerm} onCommit={commitSearch}/>
      {filterControls("","toolbar")}
      <div className="master-mobile-controls">
        <Button className="master-mobile-controls__filters" variant="secondary" size="default" aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)}>Filters{activeFilterCount?` · ${activeFilterCount} active`:""}</Button>
      </div>
    </div>
    <p aria-live="polite">{sorted.length.toLocaleString()} {sorted.length===1?"model":"models"}{selectedProviders.length?` · ${providerSelectionLabel(selectedProviders)}`:""}{favoritesOnly?` · ${favorites.length} favorites saved in this browser`:""}<span className="master-sort-summary"> · Sorted by {sortLabel} {direction==="asc"?"↑":"↓"}</span>{missingCount>0&&<span> · Missing values appear last.</span>}</p>
    <HelperText className="leaderboard-legend personality-legend">{LEGEND}</HelperText>
    {favoriteNotice&&<Alert role="status" live="polite" tone="error">{favoriteNotice}</Alert>}
    <TableScroll showOverflowCue earlierColumnsLabel="Columns behind the model column" label={`Personality, ${levelTitle}, scroll horizontally for more columns`}><Table><caption className="sr-only">{levelTitle}: AA-PersonalityBench {level.kind==="trait"?"percentile, Elo and Elo 95% interval":"percentiles"} per model</caption>
      <thead><tr>
        <th scope="col" className="master-model" aria-sort={ariaSort("model")}><Button variant="quiet" size="compact" onClick={()=>sortTo("model")}>Model {arrow("model")}</Button></th>
        <th scope="col" className="master-provider" aria-sort={ariaSort("provider")}><Button variant="quiet" size="compact" onClick={()=>sortTo("provider")}>Provider {arrow("provider")}</Button></th>
        {columns.map(scoreHeader)}
        {level.kind==="trait"&&<th scope="col" className="numeric" data-column="interval"><span className="personality-static-header">Elo 95% interval<small>Lower–upper</small></span></th>}
      </tr></thead>
      <tbody>{pageRows.map(m=>{const favorite=favorites.includes(m.identity_key);const trait=level.kind==="trait"?m.traits[level.trait.key]:undefined;return <tr key={m.identity_key}>
        <td className="master-model"><IconButton className="favorite-star" size="compact" type="button" aria-pressed={favorite} aria-label={`${favorite?"Remove":"Add"} ${m.name} to favorites`} title={`${favorite?"Remove from":"Add to"} favorites`} onClick={()=>toggleFavorite(m.identity_key)}>{favorite?"★":"☆"}</IconButton> <span className="personality-model">{m.name}<small className="personality-model__provider">{m.provider}</small></span></td>
        <td className="master-provider">{m.provider}</td>
        {level.kind==="trait"
          ? <><td className="numeric">{trait?.percentile==null?<span className="muted">—</span>:formatPercentile(trait.percentile)}</td><td className="numeric">{trait?.elo==null?<span className="muted">—</span>:formatElo(trait.elo)}</td><td className="numeric" data-column="interval">{trait?.elo_interval?formatEloInterval(trait.elo_interval):<span className="muted">—</span>}</td></>
          : columns.map(c=>{const value=c.value(m);return <td key={c.key} className="numeric">{value===null?<span className="muted">—</span>:formatPercentile(value)}</td>;})}
      </tr>;})}{!sorted.length&&<tr><td className="empty" colSpan={columns.length+(level.kind==="trait"?3:2)}>No models match these filters.</td></tr>}</tbody>
    </Table></TableScroll>
    <Pagination page={page} pages={pages} onPageChange={nextPage=>update({i:nextPage})} pageSize={size} pageSizeOptions={[25,50,100]} onPageSizeChange={nextSize=>update({z:nextSize})}/>
    <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Personality filters" id="personality-filters">
      <div className="master-filter-drawer">
        <div className="master-filter-drawer__controls">{filterControls("filters-","drawer")}</div>
      </div>
    </Drawer>
  </Card>;
}
