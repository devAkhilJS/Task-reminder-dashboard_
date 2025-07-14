import { inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Auth, authState, User } from "@angular/fire/auth";
import { filter, map, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})

export class UserResolver implements Resolve<Observable<User | null>> {
  private auth = inject(Auth);
  user$ = authState(this.auth).pipe(
    filter((user: User | null): user is User => user !== null),
    map(user => user)
  );

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<User | null> {
    return authState(this.auth).pipe(
      map(user => user ?? null)
    );
  }
}