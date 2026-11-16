local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local function stable(value,active)
    local kind=type(value)
    if kind=='nil' then return 'nil' end
    if kind=='number'then return string.format('%.17g',value)end
    if kind=='boolean'then return tostring(value)end
    if kind=='string'then return string.format('%q',value)end
    assert(kind=='table','non-data core value '..kind)
    active=active or {};assert(not active[value],'cycle in core');active[value]=true
    local keys,rows={},{}
    for key in pairs(value)do keys[#keys+1]=key end
    table.sort(keys,function(a,b)return type(a)..tostring(a)<type(b)..tostring(b)end)
    for _,key in ipairs(keys)do rows[#rows+1]='['..stable(key,active)..']='..stable(value[key],active)end
    active[value]=nil;return '{'..table.concat(rows,',')..'}'
end
local function instrument(root)
    local counts,cache,original,seen={},{},{},{}
    local function walk(control)
        if seen[control]then return end;seen[control]=true
        for name,fn in pairs(control)do
            if type(fn)=='function'and(name:match('^Set')or name:match('^Destroy')or name:match('^Clear'))then
                cache[name]=cache[name]or{}
                local wrapped=cache[name][fn]
                if not wrapped then
                    wrapped=function(self,...)
                        counts[name]=(counts[name]or 0)+1
                        return fn(self,...)
                    end
                    cache[name][fn]=wrapped
                end
                original[#original+1]={control,name,fn};control[name]=wrapped
            end
        end
        for _,child in pairs(control.children or{})do walk(child)end
        for _,child in pairs(control.items or{})do walk(child)end
    end
    walk(root);assert(#original>0,'native control methods were not instrumented')
    return counts,function()for _,row in ipairs(original)do row[1][row[2]]=row[3]end end
end
local function scenario(name,deck,enemies,plays)
    local h,u,_,event,_,_,_,root=H.setup(deck,enemies,{touchScreen=function()return true end})
    local dataBefore=stable(H.F.Data)
    local counts,restore=instrument(root)
    local accepted,waits,states=0,{},{}
    -- Do not use and/or for the intentional nil Click value.
    local function mixedTap(control,id)
        local x,y;if control=='playArea'then x,y=0,0 end
        event(control,'down',id,x,y);event(control,'up',id,x,y)
        if POINTER_BENCH_MIXED then event(control,'click',nil,x,y)else event(control,'click',id,x,y)end
    end
    for i=1,plays do
        local before=h.run.combat.energy
        mixedTap('card1',i*2)
        mixedTap(name=='defend'and'playArea'or'enemy'..(i%2+1),i*2+1)
        if h.run.combat.energy==before-1 then accepted=accepted+1 end
        states[#states+1]=stable(h.run.combat)
        local frames=0
        while u.busy or h.motion.deathReveal do
            h:update(1/60);frames=frames+1;assert(frames<600,'feedback did not unlock')
        end
        waits[#waits+1]=frames
        -- The next physical sequence is submitted immediately when the existing gate opens.
    end
    restore();assert(stable(H.F.Data)==dataBefore,'immutable data changed')
    print('SCENARIO\t'..name)
    print('ACCEPTED\t'..accepted)
    print('FEEDBACK_FRAMES\t'..table.concat(waits,','))
    print('EXTRA_READY_WAIT_FRAMES\t0')
    print('CORE\t'..stable(states))
    print('DATA\t'..dataBefore)
    local keys={};for key in pairs(counts)do keys[#keys+1]=key end;table.sort(keys)
    for _,key in ipairs(keys)do print('METHOD\t'..key..'\t'..counts[key])end
end
scenario('defend',{'defend','defend','defend'},nil,3)
scenario('strike',{'strike','strike'},{'cultist','cultist'},2)
