# Copyright (c) 2026 PANK4SS
# SPDX-License-Identifier: MIT
#
# Script d'origine du projet Blason, conserve pour memoire. Non utilise par
# l'application : sa logique a ete reprise et corrigee dans src/core/.

import cv2, numpy as np, os, sys
from scipy.ndimage import gaussian_filter1d

SRC="/mnt/user-data/uploads/Ornamental_Emblem_Identity_Grid.png"
OUT="/mnt/user-data/outputs/svg"
os.makedirs(OUT,exist_ok=True)
names=["anansi","eshu","leviathan","orun","ra","sedna","quetzal",
       "fenrir","lilith","zehpyr","thoth","inanna","kukulkan","athena"]
img=cv2.imread(SRC)
bands=[(200,480),(650,920)]
up=4
def colsplit(mask):
    p=mask.sum(0)>0
    segs=[];s=None
    for i,v in enumerate(p):
        if v and s is None:s=i
        if not v and s is not None:
            segs.append((s,i));s=None
    if s is not None:segs.append((s,len(p)))
    # merge tiny gaps
    m=[]
    for a,b in segs:
        if m and a-m[-1][1]<12:m[-1]=(m[-1][0],b)
        else:m.append((a,b))
    return [x for x in m if x[1]-x[0]>40]
def bez(pts):
    # closed Catmull-Rom -> cubic bezier
    n=len(pts);d=""
    d+=f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"
    for i in range(n):
        p0=pts[(i-1)%n];p1=pts[i];p2=pts[(i+1)%n];p3=pts[(i+2)%n]
        c1=p1+(p2-p0)/6;c2=p2-(p3-p1)/6
        d+=f"C{c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p2[0]:.2f},{p2[1]:.2f}"
    return d+"Z"
k=0
for (y0,y1) in bands:
    band=img[y0:y1]
    dist=255-band.min(axis=2)  # distance from white
    mask=dist>40
    for (x0,x1) in colsplit(mask):
        pad=12
        xa=max(0,x0-pad);xb=x1+pad
        crop=img[y0:y1,xa:xb]
        m=(255-crop.min(axis=2))>40
        ys,xs=np.where(m)
        ya,yb=ys.min()-pad,ys.max()+pad
        ya=max(0,ya);yb=min(crop.shape[0],yb)
        crop=crop[ya:yb]
        big=cv2.resize(crop,None,fx=up,fy=up,interpolation=cv2.INTER_CUBIC)
        g=(255-big.min(axis=2)).astype(np.float32)
        g=cv2.GaussianBlur(g,(0,0),1.5)
        bm=(g>70).astype(np.uint8)*255
        # color = median of strongly colored pixels
        sel=(255-big.min(axis=2))>110
        col=np.median(big[sel],axis=0)[::-1].astype(int)
        hexc="#%02X%02X%02X"%tuple(col)
        cs,h=cv2.findContours(bm,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
        paths=[]
        for c in cs:
            if cv2.contourArea(c)<60*up*up/4: continue
            p=c[:,0,:].astype(float)
            if len(p)<12: continue
            p=np.stack([gaussian_filter1d(p[:,0],3,mode="wrap"),gaussian_filter1d(p[:,1],3,mode="wrap")],1)
            step=max(1,len(p)//max(12,int(len(p)/9)))
            p=p[::step]
            if len(p)<4: continue
            paths.append(bez(p/up))
        H,W=crop.shape[:2]
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W*2}" height="{H*2}"><path fill="{hexc}" fill-rule="evenodd" d="{"".join(paths)}"/></svg>'
        open(f"{OUT}/{names[k]}.svg","w").write(svg)
        print(names[k],hexc,W,H,len(paths))
        k+=1
print(k)
